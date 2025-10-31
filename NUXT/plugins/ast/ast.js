import * as walk from "acorn-walk";

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
  let n = null;
  for (let node of parsed.body[1].expression.callee.body.body) {
    if (node?.type === "VariableDeclaration") {
      for (let v of node.declarations) {
        if (v.id.name === funcNode) {
          if (v.init) {
            for (let i = 0; i < v.init?.elements?.length; i++) {
              v.init = findMethodByName(parsed, v.init.elements[i].name);
            }
            return v;
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

export function getUndeclaredMethods(funcCode, nFunctionName, globalArray = []) {
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
    FunctionExpression(node, ancestors) {
      addDeclaredFromParams(node.params);
    },
    ArrayExpression(node) {
      for (let i = 0; i < node.elements.length; i++) {
        if (node.elements[i].type === "MemberExpression") {
          // node.elements[i] = processJs(node.elements[i], globalArray);
        }
        if (node.elements[i].type === "Identifier") {
          unDeclared.add(node.elements[i].name);
        }
      }
    },
    CallExpression(node) {
      let name;
      if (node.callee.type === "Identifier") {
        name = node.callee.name;
      } else if (node.callee.type === "MemberExpression") {
        const obj = node.callee.object;
        if (obj.type === "Identifier") name = obj.name;
      }
      if (name && !declared.has(name)) {
        if (name !== nFunctionName) {
          unDeclared.add(name);
        }

      }
    },
    IfStatement(node, ancestors) {
      for (let i = 0; i < node?.test?.expressions?.length; i++) {
        let expr = node.test.expressions[i];
        if (expr?.left?.argument?.name) {
          unDeclared.add(expr.left.argument.name);
        }
      }
      if (node?.test?.left?.argument?.name) {
        unDeclared.add(node?.test?.left.argument.name);
      }
    },
  });
  unDeclared = new Set([...unDeclared].filter(name => !excludeArrayMethodsName.includes(name)));
  declared = new Set([...declared].filter(name => !excludeArrayMethodsName.includes(name)));

  return unDeclared.difference(declared);
}
export function processMemberExpression(nodeRight, ancestors, arrayName) {
  if (nodeRight.object.name === arrayName) {
    let parent = ancestors.at(-2);
    if (parent === undefined) {
      return;
    }
    for (const key of Object.keys(parent)) {
      if (parent[key] === nodeRight) {
        parent[key] = {
          "type": "Literal",
          "value": parent[key].property.value,
          "raw": JSON.stringify(parent[key].property.value)
        };
        break;
      }
    }
  }
}
export function processJs(nodeForProcessing, globalArray) {

  if (nodeForProcessing === null) {
    return null;
  }
  let arrayData = globalArray.globalArrayData;
  let arrayName = globalArray.globalArrayName;

  walk.ancestor(nodeForProcessing, {
    MemberExpression(node, ancestors) {
      let nodeRight = node;
      switch (nodeRight.type) {
        case "MemberExpression":
          processMemberExpression(nodeRight, ancestors, arrayName);
          break;
      }
    },
    VariableDeclaration(node, ancestors) {
      let nodeInit = node.declarations[0].init;
      if (nodeInit) {
        if (nodeInit.arguments) {
          for (let i = 0; i < nodeInit.arguments.length; i++) {
            if (nodeInit.arguments[i].property) {
              nodeInit.arguments[i] = {
                "type": "Literal",
                "value": nodeInit.arguments[i].property.value,
                "raw": JSON.stringify(nodeInit.arguments[i].property.value)
              };
            }
          }
        }
      }
    },
    AssignmentExpression(node, ancestors) {
      let nodeRight = node.right;
      if (nodeRight.type === "CallExpression") {
        for (let i = 0; i < nodeRight.arguments.length; i++) {
          if (nodeRight.arguments[i]?.object?.name === arrayName) {
            nodeRight.arguments[i] = {
              "type": "Literal",
              "value": nodeRight.arguments[i].property.value,
              "raw": JSON.stringify(nodeRight.arguments[i].property.value)
            };
          }

        }
      }
    },
    CallExpression(node, ancestors) {
      let nodeRight = node.callee;
      switch (nodeRight.type) {
        case "MemberExpression":
          if (nodeRight.property.object) {
            nodeRight.property = {
              "type": "Literal",
              "value": nodeRight.property.property.value,
              "raw": JSON.stringify(nodeRight.property.property.value)
            }
          }
          if (nodeRight.property.raw) {
            nodeRight = {
              "type": "Literal",
              "value": nodeRight.property.raw,
              "raw": JSON.stringify(nodeRight.property.raw)
            }
          }
      }
    },
    LogicalExpression(node, ancestors) {
      node.left = processJs(node?.left, globalArray);
      node.right = processJs(node?.right, globalArray);
    },
    ArrayExpression(node, ancestors) {
      for (let i = 0; i < node.elements.length; i++) {
        const el = node.elements[i];
        if (!el) continue;

        if (
          el.type === "MemberExpression" &&
          el.object?.name === globalArray.globalArrayName &&
          el.property?.type === "Literal"
        ) {
          node.elements[i] = {
            type: "Literal",
            value: el.property.value,
            raw: JSON.stringify(el.property.value)
          };
        } else {
          node.elements[i] = processJs(el, globalArray);
        }
      }
    },
    Literal(node, ancestors) {
      if (node.value !== undefined) {
        node.value = arrayData[node.value];
      }
    },

    IfStatement(node, ancestors) {
      for (let i = 0; i < node?.test?.expressions?.length; i++) {
        let expr = node.test.expressions[i];
        if (expr?.right?.type === "ArrayExpression") {
          expr.right = processJs(expr?.right, globalArray);
        }
      }
      node.test = processJs(node.test, globalArray);
    }
  });
  return nodeForProcessing;
}





// console.log(generate(funcCode) + additionalCode);
