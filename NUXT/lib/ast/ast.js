import * as walk from "acorn-walk";
import {generate} from "astring";
import {parse} from "acorn";
import * as acorn from "acorn";
export function collectDependencies(entryCode, challengeName, parsedBaseJs) {
  const processed = new Set();
  const codeMap = new Map();
  const depsMap = new Map();
  const { globalArrayName, globalArrayData } = findGlobalArray(parsedBaseJs);

  function collect(name) {
    if (name === challengeName || processed.has(name)) return;
    processed.add(name);

    const node = findMethodByName(parsedBaseJs, name);
    if (!node) return;

    const rawCode = generate(node).replace("};;", "};").replace("};\n;", "};\n");
    const code = ensureVarDeclaration(node, rawCode);
    codeMap.set(name, code);

    const parsed = acorn.parse(code, { ecmaVersion: 2020 });
    const deps = new Set(getUndeclaredMethods(parsed, challengeName));

    // `name` may be a constructor used only via `new name(...)` — its
    // prototype methods (toString, clone, set, ...) are attached via
    // separate statements elsewhere in the file (either literal
    // `name.prototype.method = ...` or the `alias = name.prototype;
    // alias.method = ...` idiom) and are never referenced by the
    // identifier "name" itself, so the walk above can't find them.
    // Pull them in explicitly so a dependency's prototype API isn't
    // silently dropped from the extracted output.
    const protoMethods = collectPrototypeMethods(parsedBaseJs, name, globalArrayData, globalArrayName);
    if (protoMethods.length) {
      const protoKey = name + "$$proto";
      const protoRawCode = protoMethods.map(n => {
        const raw = generate(n).replace("};;", "};").replace("};\n;", "};\n");
        return ensureVarDeclaration(n, raw);
      }).join("\n");
      codeMap.set(protoKey, protoRawCode);

      const protoParsed = acorn.parse(protoRawCode, { ecmaVersion: 2020 });
      const protoDeps = getUndeclaredMethods(protoParsed, challengeName);
      for (const dep of protoDeps) deps.add(dep);
      // proto methods must be emitted after the constructor itself
      depsMap.set(protoKey, new Set([...protoDeps, name]));
    }

    depsMap.set(name, deps);

    for (const dep of deps) {
      collect(dep);
    }
  }

  const initialDeps = getUndeclaredMethods(
    acorn.parse(entryCode, { ecmaVersion: 2020 }),
    challengeName
  );
  for (const name of initialDeps) {
    collect(name);
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
  let bareDeclarationFound = false;
  for (let node of body) {
    if (node?.type === "FunctionDeclaration" && node.id?.name === funcNode) {
      return node;
    }
    if (node?.type === "VariableDeclaration") {
      for (let v of node.declarations) {
        if (v.id.name === funcNode) {
          if (!v.init) bareDeclarationFound = true;
          if (v.init) {
            const wasEmptyArrayLiteral = v.init.type === "ArrayExpression" && v.init.elements.length === 0;
            // Only arrays of bare function-name references (e.g. `var x = [helperFn]`)
            // need their element resolved to that function's own definition — an
            // array of literals (e.g. `var rates = [.25, .5, .75]`) must be left
            // untouched, otherwise this used to blindly resolve the first element's
            // (nonexistent) `.name` to null and clobber the whole array with `null`.
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

            // A mutable shared-state array (e.g. `var H=[]`) is populated at
            // module load time via scattered top-level `H[<literal>]=<literal>;`
            // statements (not inside any function). Functions that close over
            // it later read those slots, so they must run too.
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
      }
    }
    if (node?.type === "ExpressionStatement") {
      if (node?.expression?.left?.name === funcNode) {
        if (node?.expression?.right) {
          return node;
        }
      }
    }
    if(node?.type === "AssignmentExpression" && node.left.name === funcNode) {
      if (node.right) {
        return node;
      }
    }
  }

  // Fallback: a bare `var ..., name;` (no initializer) whose value is actually
  // assigned inside a top-level control-flow statement (e.g. a labeled block
  // doing browser/UA sniffing: `a:{ ... name = x; break a } name = y`).
  const assigningStatement = findAssigningStatement(body, funcNode);
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

  // Bare `var ..., name;` with no top-level assignment found — the value is
  // set lazily inside a function's closure (e.g. memoization: `name===void 0&&(name=f())`).
  // A plain `var name;` (initially undefined) is correct in that case.
  if (bareDeclarationFound) {
    return {
      type: "VariableDeclaration",
      kind: "var",
      declarations: [{type: "VariableDeclarator", id: {type: "Identifier", name: funcNode}, init: null}],
    };
  }

  return n;
}

// Finds top-level `name[<literal index>] = <literal>;` statements — the pattern
// used to seed a shared-state array/object with constants that closures read later.
// Only literal keys/values are collected: anything referencing another identifier
// is a side effect local to whatever function it lives in, not module-load state.
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

const CONTROL_FLOW_CONTAINER_TYPES = new Set([
  "BlockStatement", "IfStatement", "LabeledStatement", "ForStatement", "ForInStatement",
  "ForOfStatement", "WhileStatement", "DoWhileStatement", "TryStatement", "CatchClause",
  "SwitchStatement", "SwitchCase",
]);

// Finds a top-level statement whose control-flow subtree (ignoring nested
// function bodies) contains an assignment to `funcNode`, without descending
// into nested functions where an identically-named local could false-match.
function findAssigningStatement(body, funcNode) {
  function assignsTarget(node) {
    if (!node || typeof node !== "object") return false;
    if (node.type === "AssignmentExpression" && node.left?.type === "Identifier" && node.left.name === funcNode) {
      return true;
    }
    if (!CONTROL_FLOW_CONTAINER_TYPES.has(node.type) && node.type !== "ExpressionStatement" && node.type !== "VariableDeclaration" && node.type !== "VariableDeclarator") {
      if (node.type.includes("Function") || node.type === "ClassDeclaration" || node.type === "ClassExpression") return false;
    }
    if (node.type.includes("Function")) return false;
    for (const key in node) {
      if (key === "start" || key === "end" || key === "loc" || key === "range") continue;
      const value = node[key];
      if (Array.isArray(value)) {
        for (const item of value) {
          if (item && typeof item.type === "string" && assignsTarget(item)) return true;
        }
      } else if (value && typeof value.type === "string") {
        if (assignsTarget(value)) return true;
      }
    }
    return false;
  }

  for (const node of body) {
    if (node && assignsTarget(node)) {
      return node;
    }
  }
  return null;
}

/**
 * Collects all prototype method assignment nodes for a given constructor.
 *
 * Handles two patterns:
 *   1. Encoded:  ctor[*[**]][*[**]] = function(...)  where *[**] === 'prototype'
 *   2. Literal:  ctor.prototype.methodName = function(...)
 *
 * @param {object} parsed       - acorn-parsed AST of the full script
 * @param {string} constructorName - e.g. "g.**" or "**"
 * @param {Array}  globalArrayData - decoded * array (may be null for literal-only search)
 * @param {string} globalArrayName - name of the * array variable in the source
 * @returns {Array<object>}  array of ExpressionStatement AST nodes
 */
export function collectPrototypeMethods(parsed, constructorName, globalArrayData, globalArrayName) {
  const results = [];
  const body = parsed.body[1]?.expression.callee.body.body || parsed.body[0]?.expression.callee.object.body.body;

  // Normalise constructorName for comparison: generate() output of the left-most object
  // e.g. "g.**" or "**"
  const ctorNorm = constructorName.trim();

  // Tracks the "u = X.prototype; u.method = ...;" idiom, where a single alias
  // identifier (e.g. "u") is repeatedly reassigned to different constructors'
  // prototypes throughout the file, and later statements attach methods to
  // whichever prototype the alias currently points to. Since the alias is
  // reused for many unrelated classes, we must resolve it based on source
  // order rather than treating it as a stable reference to one constructor.
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

    // --- Pattern 3: aliased  u.method = function(...)  where u currently
    // aliases ctorNorm's prototype ---
    if (!left.computed && left.object?.type === "Identifier") {
      const aliasTarget = aliasMap.get(left.object.name);
      if (aliasTarget && aliasTarget === ctorNorm) {
        // The alias identifier (e.g. "u") only resolves to this
        // prototype at this specific point in the original source's
        // execution order — we don't carry that assignment over into
        // the extracted snippet, so referencing the bare alias here
        // would be a ReferenceError. Rewrite the statement to target
        // the constructor's prototype directly instead.
        const rewritten = JSON.parse(JSON.stringify(node));
        rewritten.expression.left.object = acorn.parse(ctorNorm + ".prototype", {ecmaVersion: 2020}).body[0].expression;
        results.push(rewritten);
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
          if (ctorGenerated === ctorNorm) {
            results.push(node);
            continue;
          }
        }
      }
    }

    // --- Pattern 2: literal  ctor.prototype.method ---
    if (
      !obj.computed &&
      (obj.property?.name === "prototype" || obj.property?.value === "prototype")
    ) {
      const ctorGenerated = generate(obj.object).trim();
      if (ctorGenerated === ctorNorm) {
        results.push(node);
      }
    }
  }

  return results;
}


/**
 *  Removes duplicate top-level statements from generated code, keeping only
 *  the first occurrence of each exact source text. Needed because separate
 *  collectDependencies() calls don't share a codeMap, so the same helper can end
 *  up emitted twice when their outputs are concatenated. Comparing by exact
 *  text (rather than by declared name) is deliberate: a variable can be
 *  legitimately reassigned to a different value/function later on, and that
 *  must survive — only truly identical chunks are dropped.
 * @param code is a function body (may contain a top-level `return`), not a
 * standalone script, hence allowReturnOutsideFunction.
 * @returns {string}
 */
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

export function getUndeclaredMethods(funcCode, nFunctionName) {
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
        if (node.object.name !== nFunctionName) {
          unDeclared.add(fullName);
        }
      }
    },
    Identifier(node, ancestors) {
      if (!ancestors || ancestors.length === 0) return;
      const parent = ancestors[ancestors.length - 1];
      if (node.name === nFunctionName) return;

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
