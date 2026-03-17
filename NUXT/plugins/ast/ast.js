import * as walk from "acorn-walk";
import {generate} from "astring";
import {parse} from "acorn";

export function findGlobalArray(parsedBaseJs) {
  let globalArrayName = "";
  let globalArrayData = null;
  let globalArrayFound = false;
  for (let node of parsedBaseJs.body[1].expression.callee.body.body) {
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
export function findMethodByName(parsed, funcNode) {
  if (!funcNode) return null;
  let n = null;
  const dotIndex = funcNode.indexOf(".");
  if (dotIndex !== -1) {
    const objName = funcNode.substring(0, dotIndex);
    const propName = funcNode.substring(dotIndex + 1);
    for (let node of parsed.body[1].expression.callee.body.body) {
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
  for (let node of parsed.body[1].expression.callee.body.body) {
    if (node?.type === "VariableDeclaration") {
      for (let v of node.declarations) {
        if (v.id.name === funcNode) {
          if (v.init) {
            for (let i = 0; i < v.init?.elements?.length; i++) {
              v.init = findMethodByName(parsed, v.init.elements[i].name);
            }
            return {
              type: "VariableDeclaration",
              kind: node.kind,
              declarations: [v],
              start: node.start,
              end: node.end,
            };
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
  return n;
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
  const body = parsed.body[1].expression.callee.body.body;

  // Normalise constructorName for comparison: generate() output of the left-most object
  // e.g. "g.**" or "**"
  const ctorNorm = constructorName.trim();

  for (const node of body) {
    if (node.type !== "ExpressionStatement") continue;
    const expr = node.expression;
    if (expr?.type !== "AssignmentExpression") continue;
    const left = expr.left;
    if (left.type !== "MemberExpression") continue;

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
    AssignmentExpression(node) {
      if (node.left?.type === "Identifier") {
        declared.add(node.left.name);
      }
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

  return unDeclared.difference(declared);
}
