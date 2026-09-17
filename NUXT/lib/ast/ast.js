import * as walk from "acorn-walk";
import {generate} from "astring";
import {parse} from "acorn";
import * as acorn from "acorn";
// Collects and topo-sorts all dependencies for one or more entry points
// (entryCode/ownNames may be a single value or an array), sharing one
// visited-set so a dependency reachable from multiple entries is emitted once.
export function collectDependencies(entryCode, ownNames, parsedBaseJs) {
  const ownNameSet = new Set(Array.isArray(ownNames) ? ownNames : [ownNames]);
  const processed = new Set();
  const codeMap = new Map();
  const depsMap = new Map();
  const { globalArrayName, globalArrayData } = findGlobalArray(parsedBaseJs);

  function collect(name) {
    if (ownNameSet.has(name) || processed.has(name)) return;
    processed.add(name);

    const node = findMethodByName(parsedBaseJs, name);
    if (!node) return;

    const rawCode = generate(node).replace("};;", "};").replace("};\n;", "};\n");
    const code = ensureVarDeclaration(node, rawCode);
    codeMap.set(name, code);

    const parsed = acorn.parse(code, { ecmaVersion: 2020 });
    const deps = new Set(getUndeclaredMethods(parsed, ownNameSet));

    // `name` may be a constructor whose prototype methods live in
    // separate statements not referenced by the identifier itself.
    const protoMethods = collectPrototypeMethods(parsedBaseJs, name, globalArrayData, globalArrayName);
    if (protoMethods.length) {
      const protoKey = name + "$$proto";
      const protoRawCode = protoMethods.map(n => {
        const raw = generate(n).replace("};;", "};").replace("};\n;", "};\n");
        return ensureVarDeclaration(n, raw);
      }).join("\n");
      codeMap.set(protoKey, protoRawCode);

      const protoParsed = acorn.parse(protoRawCode, { ecmaVersion: 2020 });
      const protoDeps = getUndeclaredMethods(protoParsed, ownNameSet);
      for (const dep of protoDeps) deps.add(dep);
      // proto methods must be emitted after the constructor itself
      depsMap.set(protoKey, new Set([...protoDeps, name]));
    }

    depsMap.set(name, deps);

    for (const dep of deps) {
      collect(dep);
    }
  }

  const entries = Array.isArray(entryCode) ? entryCode : [entryCode];
  for (const entry of entries) {
    const initialDeps = getUndeclaredMethods(
      acorn.parse(entry, { ecmaVersion: 2020 }),
      ownNameSet
    );
    for (const name of initialDeps) {
      collect(name);
    }
  }

  const sorted = [];
  const visited = new Set();

  function topoSort(name) {
    if (visited.has(name)) return;
    visited.add(name);
    for (const dep of (depsMap.get(name) || [])) {
      topoSort(dep);
    }
    if (codeMap.has(name)) {
      sorted.push(name);
    }
  }

  for (const name of codeMap.keys()) {
    topoSort(name);
  }

  return sorted.map(name => codeMap.get(name)).join("\n");
}
export function findGlobalArray(parsedBaseJs) {
  let globalArrayName = "";
  let globalArrayData = null;
  let globalArrayFound = false;
  let globalArrayBody = parsedBaseJs.body[1]?.expression.callee.body.body || parsedBaseJs.body[0]?.expression.callee.object.body.body;
  for (let node of globalArrayBody) {
    if (globalArrayFound) {
      break;
    }
    if (node?.type === "VariableDeclaration") {
      for (let v of node.declarations) {
        if (v.init?.callee?.object?.type === "Literal") {
          globalArrayName = v.id.name;
          let splitArg = v.init?.arguments[0].value;
          globalArrayData = v.init?.callee?.object.value.split(splitArg.toString());
          globalArrayFound = true;
          break;
        }
        if (v?.init?.elements) {
          globalArrayName = v.id.name;
          let globalArrayDataValue = generate(v.init);
          try {
            globalArrayData = JSON.parse(globalArrayDataValue);
          }catch (e) {
            globalArrayData = Function(`"use strict"; return ${globalArrayDataValue}`)();
          }
          globalArrayFound = true;
          break;
        }
      }
    }
  }
  return {globalArrayName: globalArrayName, globalArrayData: globalArrayData};
}
export function findDecipherFunction(parsed, functionName) {
  let funcNode = null;
  walk.simple(parsed, {
    AssignmentExpression(node) {
      if (node.left.type === "Identifier" && node.left.name === functionName) {
        if (node.right.type === "FunctionExpression" || node.right.type === "ArrowFunctionExpression") {
          funcNode = node;
        }
      }
    }
  });
  return funcNode;
}

// AST equivalents of the old locator regexes:
//   TCL: /\]\]&&\([A-z0-9$]+\=([A-z0-9$]+)\(([0-9]+),([0-9]+),[A-z0-9$]+\)\);(?:\)|)/
//   web: /\]\]=([A-z0-9$]+)\(([0-9]+),([0-9]+),[A-z0-9$]+\)\);/
// Finds the n-function call site (a `]]`-shaped double-computed member on the
// left, feeding a call with two numeric literal args). Ambiguous on its own —
// unrelated helpers can share this exact shape — so it is only a fallback.
//
// The real n-transform always throws on failure. AST equivalent of:
// /throw new [A-z0-9$]+\([A-z]\[/ (where [A-z] is the global array name) is
// searched for across every function in the file. When found directly inside
// a function's body (not a nested function), that function is used as the
// required one, and its call arguments are re-derived from a plain call
// elsewhere in the code, AST equivalent of:
// /Ne\([0-9]+,[0-9]+,[A-z0-9$]+\);/ (where `Ne` is that function's name),
// rather than trusting args from the `]]`-shaped structural match.
export function findNFunctionCallSite(parsedBaseJs, isTcl) {
  const confirmed = confirmNFunctionByThrow(parsedBaseJs);
  if (confirmed) return confirmed;
  return isTcl ? findNFunctionCallSiteTcl(parsedBaseJs) : findNFunctionCallSiteWeb(parsedBaseJs);
}

function confirmNFunctionByThrow(parsedBaseJs) {
  const { globalArrayName } = findGlobalArray(parsedBaseJs);
  if (!globalArrayName) return null;

  // A throw whose constructor's argument indexes into the global array:
  // `throw new Err(globalArray[...])`. Only throws that are direct
  // descendants of `funcNode` count - a throw belonging to a nested
  // function does not implicate the outer one.
  function throwsFromGlobalArrayDirect(funcNode) {
    if (!funcNode) return false;
    let found = false;
    (function visit(node) {
      if (found || !node || typeof node !== "object") return;
      if (node.type?.includes("Function") && node !== funcNode) return;
      if (node.type === "ThrowStatement") {
        const arg = node.argument;
        if (arg?.type === "NewExpression" && arg.callee?.type === "Identifier") {
          for (const a of arg.arguments || []) {
            if (
              a.type === "MemberExpression" &&
              a.computed &&
              a.object?.type === "Identifier" &&
              a.object.name === globalArrayName
            ) {
              found = true;
              return;
            }
          }
        }
      }
      for (const key in node) {
        if (key === "start" || key === "end" || key === "loc" || key === "range") continue;
        const value = node[key];
        if (Array.isArray(value)) {
          for (const item of value) if (item && typeof item.type === "string") visit(item);
        } else if (value && typeof value.type === "string") {
          visit(value);
        }
      }
    })(funcNode.body);
    return found;
  }

  // A bare call `funcName(a, b, ident);` elsewhere in the code - matching
  // literal, literal, identifier arguments, regardless of whether the call
  // itself sits in an expression statement or feeds a `var`/assignment.
  function findCallArgs(funcName) {
    let result = null;
    walk.simple(parsedBaseJs, {
      CallExpression(node) {
        if (result) return;
        if (node.callee?.type !== "Identifier" || node.callee.name !== funcName) return;
        if (node.arguments.length !== 3) return;
        const [a0, a1, a2] = node.arguments;
        if (!isNumericLiteral(a0) || !isNumericLiteral(a1) || a2.type !== "Identifier") return;
        result = String(a0.value) + "," + String(a1.value);
      }
    });
    return result;
  }

  // Search every named function in the file for the confirming throw,
  // earliest by source position.
  let confirmed = null;
  walk.simple(parsedBaseJs, {
    VariableDeclarator(node) {
      if (confirmed && node.start >= confirmed.node.start) return;
      if (node.id?.type !== "Identifier" || node.init?.type !== "FunctionExpression") return;
      if (throwsFromGlobalArrayDirect(node.init)) {
        confirmed = { node, funcName: node.id.name };
      }
    },
    FunctionDeclaration(node) {
      if (confirmed && node.start >= confirmed.node.start) return;
      if (!node.id?.name) return;
      if (throwsFromGlobalArrayDirect(node)) {
        confirmed = { node, funcName: node.id.name };
      }
    }
  });

  if (!confirmed) return null;
  const funcArgs = findCallArgs(confirmed.funcName);
  if (!funcArgs) return null;
  return { node: confirmed.node, funcName: confirmed.funcName, funcArgs };
}

// `obj[expr[literal]]` — nested inside `.property`, not `.object` — is what
// both locator regexes were actually matching via their literal `]]`.
function isDoubleComputedMember(node) {
  return (
    node?.type === "MemberExpression" &&
    node.computed &&
    node.property?.type === "MemberExpression" &&
    node.property.computed
  );
}

function isNumericLiteral(node) {
  return node?.type === "Literal" && typeof node.value === "number";
}

// The call's third argument is the URL-builder object being threaded
// through — regex-wise just another identifier-shaped token, so accept
// either an Identifier or a bare `this`.
function isThreadedRef(node) {
  return node?.type === "Identifier" || node?.type === "ThisExpression";
}

function findNFunctionCallSiteTcl(parsedBaseJs) {
  // `A && B && (assign)` is left-associative; unwrap to the operand
  // immediately before the final `&&`.
  function rightmostOperand(node) {
    while (node?.type === "LogicalExpression" && node.operator === "&&") {
      node = node.right;
    }
    return node;
  }

  let best = null;
  walk.simple(parsedBaseJs, {
    LogicalExpression(node) {
      if (node.operator !== "&&") return;
      if (!isDoubleComputedMember(rightmostOperand(node.left))) return;

      const right = node.right;
      if (right?.type !== "AssignmentExpression" || right.operator !== "=") return;
      if (right.left?.type !== "Identifier") return;

      const call = right.right;
      if (call?.type !== "CallExpression" || call.callee?.type !== "Identifier") return;
      if (call.arguments.length !== 3) return;
      const [a0, a1, a2] = call.arguments;
      if (!isNumericLiteral(a0) || !isNumericLiteral(a1) || !isThreadedRef(a2)) return;

      if (!best || node.start < best.node.start) {
        best = {
          node,
          funcName: call.callee.name,
          funcArgs: String(a0.value) + "," + String(a1.value),
        };
      }
    }
  });
  return best;
}

function findNFunctionCallSiteWeb(parsedBaseJs) {
  let best = null;
  walk.simple(parsedBaseJs, {
    AssignmentExpression(node) {
      if (node.operator !== "=") return;
      if (!isDoubleComputedMember(node.left)) return;

      const call = node.right;
      if (call?.type !== "CallExpression" || call.callee?.type !== "Identifier") return;
      if (call.arguments.length !== 3) return;
      const [a0, a1, a2] = call.arguments;
      if (!isNumericLiteral(a0) || !isNumericLiteral(a1) || !isThreadedRef(a2)) return;

      if (!best || node.start < best.node.start) {
        best = {
          node,
          funcName: call.callee.name,
          funcArgs: String(a0.value) + "," + String(a1.value),
        };
      }
    }
  });
  return best;
}

// AST equivalents of the old locator regexes:
//   TCL: /;var ([A-z0-9$]+)=new ([A-z0-9$]+)\([A-z0-9]+,[A-z0-9]+\);\1/
//   web: /=new (g.[A-z0-9$]+)\([A-z0-9$]+,.*?\);[A-z0-9$]+\.set\("alr","yes"\);/
// Finds the URL-builder ctor: TCL is `var X = new Y(a, b)` immediately
// followed by a statement starting with X (args must be identifiers/`this`/
// property chains, never a literal); web is `Y = new g.X(...)` (anywhere,
// often inside a helper function) immediately followed by `Y.set("alr","yes")`.
export function findUrlBuilderCtorSite(parsedBaseJs, isTcl) {
  return isTcl ? findUrlBuilderCtorSiteTcl(parsedBaseJs) : findUrlBuilderCtorSiteWeb(parsedBaseJs);
}

function findUrlBuilderCtorSiteTcl(parsedBaseJs) {
  function isThreadedArg(node) {
    if (!node) return false;
    if (node.type === "Identifier" || node.type === "ThisExpression") return true;
    if (node.type === "MemberExpression") return isThreadedArg(node.object);
    return false;
  }
  function startsWithIdentifier(node, name) {
    if (!node) return false;
    switch (node.type) {
      case "Identifier": return node.name === name;
      case "ExpressionStatement": return startsWithIdentifier(node.expression, name);
      case "MemberExpression": return startsWithIdentifier(node.object, name);
      case "CallExpression": return startsWithIdentifier(node.callee, name);
      case "NewExpression": return startsWithIdentifier(node.callee, name);
      case "AssignmentExpression": return startsWithIdentifier(node.left, name);
      default: return false;
    }
  }

  let best = null;
  walk.ancestor(parsedBaseJs, {
    VariableDeclaration(node, ancestors) {
      if (node.declarations.length !== 1) return;
      const decl = node.declarations[0];
      if (decl.id?.type !== "Identifier" || !decl.init) return;
      if (decl.init.type !== "NewExpression") return;
      if (decl.init.callee?.type !== "Identifier") return;
      if (decl.init.arguments.length !== 2 || !decl.init.arguments.every(isThreadedArg)) return;

      const parent = ancestors[ancestors.length - 2];
      const bodyArr = parent?.body;
      if (!Array.isArray(bodyArr)) return;
      const idx = bodyArr.indexOf(node);
      if (idx === -1 || idx + 1 >= bodyArr.length) return;
      if (!startsWithIdentifier(bodyArr[idx + 1], decl.id.name)) return;

      if (!best || node.start < best.node.start) {
        best = {node, varName: decl.id.name, ctorName: decl.init.callee.name};
      }
    }
  });
  return best;
}

function findUrlBuilderCtorSiteWeb(parsedBaseJs) {
  let best = null;
  walk.ancestor(parsedBaseJs, {
    AssignmentExpression(node, ancestors) {
      if (node.operator !== "=" || node.left?.type !== "Identifier") return;
      const varName = node.left.name;

      const init = node.right;
      if (
        init?.type !== "NewExpression" ||
        init.callee?.type !== "MemberExpression" ||
        init.callee.computed ||
        init.callee.object?.type !== "Identifier" ||
        init.callee.object.name !== "g" ||
        init.callee.property?.type !== "Identifier"
      ) return;

      // ancestors: [..., containingBlock, ExpressionStatement, AssignmentExpression(this node)]
      const statementNode = ancestors[ancestors.length - 2];
      const block = ancestors[ancestors.length - 3];
      const bodyArr = block?.body;
      if (!Array.isArray(bodyArr)) return;
      const idx = bodyArr.indexOf(statementNode);
      if (idx === -1 || idx + 1 >= bodyArr.length) return;

      const next = bodyArr[idx + 1];
      const call = next?.type === "ExpressionStatement" ? next.expression : null;
      if (
        call?.type !== "CallExpression" ||
        call.callee?.type !== "MemberExpression" ||
        call.callee.computed ||
        call.callee.object?.type !== "Identifier" ||
        call.callee.object.name !== varName ||
        call.callee.property?.name !== "set" ||
        call.arguments.length !== 2 ||
        call.arguments[0]?.value !== "alr" ||
        call.arguments[1]?.value !== "yes"
      ) return;

      if (!best || node.start < best.node.start) {
        best = {node, varName, ctorName: generate(init.callee).trim()};
      }
    }
  });
  return best;
}

export function collectMethodsOrdered(code) {
  const ast = parse(code, {
    ecmaVersion: "latest",
    sourceType: "module"
  });

  const methods = [];

  walk.simple(ast, {
    MethodDefinition(node) {
      methods.push({
        name: node.key.name,
        pos: node.start,
        node
      });
    },

    Property(node) {
      if (node.method) {
        methods.push({
          name: node.key.name,
          pos: node.start,
          node
        });
      }
    }
  });

  methods.sort((a, b) => a.pos - b.pos);

  return methods;
}

let excludeArrayMethodsName = [
  "await","break","case","catch","class","const","continue","debugger","default",
  "delete","do","else","enum","export","extends","false","finally","for","function",
  "if","implements","import","in","instanceof","interface","let","new","null","package",
  "private","protected","public","return","static","super","switch","this","throw",
  "true","try","typeof","var","void","while","with","yield",

  "eval","isFinite","isNaN","parseFloat","parseInt","decodeURI","decodeURIComponent",
  "encodeURI","encodeURIComponent",

  "Object","Function","Boolean","Symbol","Error","EvalError","InternalError","RangeError",
  "ReferenceError","SyntaxError","TypeError","URIError","Number","BigInt","Math",
  "Date","String","RegExp","Array","Map","Set","WeakMap","WeakSet","ArrayBuffer",
  "SharedArrayBuffer","DataView","JSON","Promise","Generator","GeneratorFunction",
  "AsyncFunction","Reflect","Proxy","Intl","globalThis",

  "Buffer","process","global","__dirname","__filename","module","exports","require"
]
export function ensureVarDeclaration(node, code) {
  if (
    node.type === "ExpressionStatement" &&
    node.expression?.type === "AssignmentExpression" &&
    node.expression.left?.type === "Identifier"
  ) {
    return "var " + code;
  }
  return code;
}
// WeakMap-cached lookup indexes, keyed by the top-level `body` array.
const topLevelIndexCache = new WeakMap();
const assigningStatementIndexCache = new WeakMap();
const protoMethodsIndexCache = new WeakMap();

function buildTopLevelIndex(body) {
  let cached = topLevelIndexCache.get(body);
  if (cached) return cached;

  const index = new Map();
  for (let node of body) {
    if (node?.type === "FunctionDeclaration" && node.id?.name) {
      if (!index.has(node.id.name)) index.set(node.id.name, node);
      continue;
    }
    if (node?.type === "VariableDeclaration") {
      for (let v of node.declarations) {
        const name = v.id?.name;
        if (!name) continue;
        const existing = index.get(name);
        // Keep exact original semantics: a bare (no-init) declaration is
        // remembered but a *later* declaration with an initializer wins.
        if (!v.init) {
          if (!existing) index.set(name, {bareDeclaration: true, node, v});
        } else {
          index.set(name, {node, v});
        }
      }
      continue;
    }
    if (node?.type === "ExpressionStatement" && node.expression?.left?.name && node.expression?.right) {
      const name = node.expression.left.name;
      if (!index.has(name)) index.set(name, {statementNode: node});
      continue;
    }
    if (node?.type === "AssignmentExpression" && node.left?.name && node.right) {
      const name = node.left.name;
      if (!index.has(name)) index.set(name, {statementNode: node});
    }
  }

  topLevelIndexCache.set(body, index);
  return index;
}

function buildAssigningStatementIndex(body) {
  let cached = assigningStatementIndexCache.get(body);
  if (cached) return cached;

  const index = new Map();

  function assignsInto(node, targets) {
    if (!node || typeof node !== "object") return;
    if (node.type === "AssignmentExpression" && node.left?.type === "Identifier") {
      if (!targets.has(node.left.name)) targets.set(node.left.name, true);
    }
    if (node.type.includes("Function")) return;
    for (const key in node) {
      if (key === "start" || key === "end" || key === "loc" || key === "range") continue;
      const value = node[key];
      if (Array.isArray(value)) {
        for (const item of value) {
          if (item && typeof item.type === "string") assignsInto(item, targets);
        }
      } else if (value && typeof value.type === "string") {
        assignsInto(value, targets);
      }
    }
  }

  for (const node of body) {
    if (!node) continue;
    const targets = new Map();
    assignsInto(node, targets);
    for (const name of targets.keys()) {
      if (!index.has(name)) index.set(name, node);
    }
  }

  assigningStatementIndexCache.set(body, index);
  return index;
}

export function findMethodByName(parsed, funcNode) {
  if (!funcNode) return null;
  let n = null;
  const dotIndex = funcNode.indexOf(".");
  let body = parsed.body[1]?.expression.callee.body.body || parsed.body[0]?.expression.callee.object.body.body;
  if (dotIndex !== -1) {
    const objName = funcNode.substring(0, dotIndex);
    const propName = funcNode.substring(dotIndex + 1);
    for (let node of body) {
      if (node?.type === "ExpressionStatement") {
        const expr = node.expression;
        if (
          expr?.type === "AssignmentExpression" &&
          expr.left?.type === "MemberExpression" &&
          !expr.left.computed &&
          expr.left.object?.name === objName &&
          expr.left.property?.name === propName &&
          expr.right
        ) {
          return node;
        }
      }
    }
    return null;
  }
  const indexed = buildTopLevelIndex(body).get(funcNode);
  let bareDeclarationFound = false;

  if (indexed) {
    if (indexed.type === "FunctionDeclaration") return indexed;
    if (indexed.statementNode) return indexed.statementNode;
    if (indexed.bareDeclaration) {
      bareDeclarationFound = true;
    } else {
      const {node, v} = indexed;
      const wasEmptyArrayLiteral = v.init.type === "ArrayExpression" && v.init.elements.length === 0;
      // Only resolve arrays of bare function-name references, not literals.
      if (v.init.type === "ArrayExpression" && v.init.elements.every(el => el?.type === "Identifier")) {
        for (let i = 0; i < v.init.elements.length; i++) {
          v.init = findMethodByName(parsed, v.init.elements[i].name);
        }
      }
      const declNode = {
        type: "VariableDeclaration",
        kind: node.kind,
        declarations: [v],
        start: node.start,
        end: node.end,
      };

      // Empty array populated by scattered top-level `H[i]=v;` statements.
      if (wasEmptyArrayLiteral) {
        const indexAssignments = findTopLevelLiteralIndexAssignments(body, funcNode);
        if (indexAssignments.length) {
          return {
            type: "Program",
            sourceType: "script",
            body: [declNode, ...indexAssignments],
            start: node.start,
            end: indexAssignments[indexAssignments.length - 1].end,
          };
        }
      }
      return declNode;
    }
  }

  // Fallback: bare declaration assigned inside a control-flow statement.
  const assigningStatement = buildAssigningStatementIndex(body).get(funcNode);
  if (assigningStatement) {
    return {
      type: "Program",
      sourceType: "script",
      body: [
        {
          type: "VariableDeclaration",
          kind: "var",
          declarations: [{type: "VariableDeclarator", id: {type: "Identifier", name: funcNode}, init: null}],
        },
        assigningStatement,
      ],
      start: assigningStatement.start,
      end: assigningStatement.end,
    };
  }

  // Bare declaration, value set lazily inside a closure.
  if (bareDeclarationFound) {
    return {
      type: "VariableDeclaration",
      kind: "var",
      declarations: [{type: "VariableDeclarator", id: {type: "Identifier", name: funcNode}, init: null}],
    };
  }

  return n;
}

// Finds top-level `name[<literal index>] = <literal>;` statements.
function findTopLevelLiteralIndexAssignments(body, name) {
  const results = [];
  for (const node of body) {
    if (node?.type !== "ExpressionStatement") continue;
    const expr = node.expression;
    if (expr?.type !== "AssignmentExpression" || expr.operator !== "=") continue;
    const left = expr.left;
    if (
      left?.type === "MemberExpression" &&
      left.computed &&
      left.object?.type === "Identifier" &&
      left.object.name === name &&
      left.property?.type === "Literal" &&
      expr.right?.type === "Literal"
    ) {
      results.push(node);
    }
  }
  return results;
}

// Collects prototype method assignments for a constructor (encoded
// `ctor[*[*]][*[*]] = fn` or literal `ctor.prototype.method = fn`).
export function collectPrototypeMethods(parsed, constructorName, globalArrayData, globalArrayName) {
  const ctorNorm = constructorName.trim();
  const body = parsed.body[1]?.expression.callee.body.body || parsed.body[0]?.expression.callee.object.body.body;
  const index = buildProtoMethodsIndex(body, globalArrayData, globalArrayName);
  return index.get(ctorNorm) || [];
}

function buildProtoMethodsIndex(body, globalArrayData, globalArrayName) {
  let cached = protoMethodsIndexCache.get(body);
  if (cached) return cached;

  const index = new Map();
  function addResult(ctorNorm, node) {
    let arr = index.get(ctorNorm);
    if (!arr) index.set(ctorNorm, arr = []);
    arr.push(node);
  }

  // Tracks the "u = X.prototype; u.method = ...;" idiom by source order.
  const aliasMap = new Map();

  function protoTargetOf(node) {
    // Matches `X.prototype` (literal) or `X[*[*]]` where the array entry is "prototype".
    if (!node || node.type !== "MemberExpression") return null;
    if (!node.computed) {
      if (node.property?.name === "prototype" || node.property?.value === "prototype") {
        return generate(node.object).trim();
      }
      return null;
    }
    if (globalArrayData && globalArrayName) {
      const protoExpr = node.property;
      if (
        protoExpr?.type === "MemberExpression" &&
        protoExpr.object?.name === globalArrayName &&
        protoExpr.property?.type === "Literal" &&
        globalArrayData[protoExpr.property.value] === "prototype"
      ) {
        return generate(node.object).trim();
      }
    }
    return null;
  }

  for (const node of body) {
    // Track `u = X.prototype` (assignment) and `var u = X.prototype` (declaration)
    // so later `u.method = ...` statements can be attributed to X.
    if (node.type === "VariableDeclaration") {
      for (const decl of node.declarations) {
        if (decl.id?.type === "Identifier" && decl.init) {
          const target = protoTargetOf(decl.init);
          if (target) aliasMap.set(decl.id.name, target);
        }
      }
    }
    if (
      node.type === "ExpressionStatement" &&
      node.expression?.type === "AssignmentExpression" &&
      node.expression.left?.type === "Identifier"
    ) {
      const target = protoTargetOf(node.expression.right);
      if (target) aliasMap.set(node.expression.left.name, target);
    }

    if (node.type !== "ExpressionStatement") continue;
    const expr = node.expression;
    if (expr?.type !== "AssignmentExpression") continue;
    const left = expr.left;
    if (left.type !== "MemberExpression") continue;

    // --- Pattern 3: aliased  u.method = function(...) ---
    if (!left.computed && left.object?.type === "Identifier") {
      const aliasTarget = aliasMap.get(left.object.name);
      if (aliasTarget) {
        // Rewrite the alias to the real prototype (alias isn't carried over).
        const rewritten = JSON.parse(JSON.stringify(node));
        rewritten.expression.left.object = acorn.parse(aliasTarget + ".prototype", {ecmaVersion: 2020}).body[0].expression;
        addResult(aliasTarget, rewritten);
        continue;
      }
    }

    const obj = left.object;
    if (obj.type !== "MemberExpression") continue;

    // --- Pattern 1: encoded  ctor[*[*]][*[*]] ---
    if (
      left.computed &&
      obj.computed &&
      globalArrayData &&
      globalArrayName
    ) {
      const protoExpr = obj.property;
      if (
        protoExpr?.type === "MemberExpression" &&
        protoExpr.object?.name === globalArrayName &&
        protoExpr.property?.type === "Literal"
      ) {
        const protoIdx = protoExpr.property.value;
        if (globalArrayData[protoIdx] === "prototype") {
          const ctorGenerated = generate(obj.object).trim();
          addResult(ctorGenerated, node);
          continue;
        }
      }
    }

    // --- Pattern 2: literal  ctor.prototype.method ---
    if (
      !obj.computed &&
      (obj.property?.name === "prototype" || obj.property?.value === "prototype")
    ) {
      const ctorGenerated = generate(obj.object).trim();
      addResult(ctorGenerated, node);
    }
  }

  protoMethodsIndexCache.set(body, index);
  return index;
}


// Removes duplicate top-level statements, keeping the first occurrence of
// each exact source text. Safety net for leftover duplicate emissions.
export function dedupeDeclarations(code) {
  const parsed = acorn.parse(code, { ecmaVersion: 2020, allowReturnOutsideFunction: true });
  const seen = new Set();
  const body = [];

  for (const node of parsed.body) {
    const text = generate(node);
    if (seen.has(text)) continue;
    seen.add(text);
    body.push(node);
  }

  return generate({ type: "Program", sourceType: "script", body });
}

export function getUndeclaredMethods(funcCode, ownNames) {
  const ownNameSet = ownNames instanceof Set ? ownNames : new Set([ownNames]);
  let declared = new Set();
  let unDeclared = new Set();

  function addDeclaredFromParams(params) {
    for (const p of params) {
      if (p.type === "Identifier") declared.add(p.name);
    }
  }

  walk.ancestor(funcCode, {
    VariableDeclarator(node) {
      declared.add(node.id.name);
    },
    FunctionDeclaration(node) {
      declared.add(node.id.name);
      addDeclaredFromParams(node.params);
    },
    FunctionExpression(node) {
      addDeclaredFromParams(node.params);
    },
    ArrowFunctionExpression(node) {
      addDeclaredFromParams(node.params);
    },
    MemberExpression(node, ancestors) {
      if (!node.computed && node.object.type === "Identifier") {
        const fullName = node.object.name + "." + node.property.name;
        if (!ownNameSet.has(node.object.name)) {
          unDeclared.add(fullName);
        }
      }
    },
    Identifier(node, ancestors) {
      if (!ancestors || ancestors.length === 0) return;
      const parent = ancestors[ancestors.length - 1];
      if (ownNameSet.has(node.name)) return;

      // skip property keys (foo.BAR — BAR is not a reference)
      if (parent.type === "MemberExpression" && parent.property === node && !parent.computed) return;
      // skip declared names on the left side of variable declarator
      if (parent.type === "VariableDeclarator" && parent.id === node) return;
      // skip function/class declaration names
      if ((parent.type === "FunctionDeclaration" || parent.type === "FunctionExpression") && parent.id === node) return;
      // skip object property keys (shorthand is fine — value is the reference)
      if (parent.type === "Property" && parent.key === node && !parent.computed && !parent.shorthand) return;
      // skip label identifiers
      if (parent.type === "LabeledStatement" && parent.label === node) return;
      if (parent.type === "BreakStatement" || parent.type === "ContinueStatement") return;

      unDeclared.add(node.name);
    },
  });
  unDeclared = new Set([...unDeclared].filter(name => !excludeArrayMethodsName.includes(name)));
  declared = new Set([...declared].filter(name => !excludeArrayMethodsName.includes(name)));

  return new Set([...unDeclared].filter(name => !declared.has(name)));
}
