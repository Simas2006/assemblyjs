var fs = require("fs");

var instructionPointer = 0;
var processorMode = [0];
var programData;
var registers = {
  al: 0x00000000, ah: 0x00000000,
  bl: 0x00000000, bh: 0x00000000,
  cl: 0x00000000, ch: 0x00000000,
  dl: 0x00000000, dh: 0x00000000,
}
var stack = [];
var ram = [];
var flags = {
  equal: false,
  less: false,
  greater: false
}
var drivers = [];

function executeInstruction(text) {
  if ( text == "" || text.endsWith(":") || text.startsWith("#") ) {
    instructionPointer++;
    return;
  }
  var name = text.split(" ")[0];
  if ( name == "halt" || text == "%section ram" || text == "%end" ) process.exit(0);
  if ( text[1] ) var operands = text.split(" ")[1].split(",");
  if ( ["str","push","call","ret","int"].indexOf(name) <= -1 && Object.keys(registers).indexOf(operands[0]) <= -1 && ! name.startsWith("j") ) throw new Error("Invalid register");
  if ( name == "mov" ) {
    if ( operands[1].startsWith("0x") ) {
      var number = parseInt(operands[1],16);
      if ( number === NaN ) throw new Error("Invalid hex number");
      registers[operands[0]] = number;
    } else if ( Object.keys(registers).indexOf(operands[1]) > -1 ) {
      registers[operands[0]] = registers[operands[1]];
    } else {
      throw new Error("Invalid location to load");
    }
  } else if ( name == "load" ) {
    if ( operands[1].startsWith("0x") ) {
      var number = parseInt(operands[1],16);
      if ( number === NaN ) throw new Error("Invalid hex number");
      if ( number >= ram.length ) throw new Error("RAM indexed out of bounds");
      registers[operands[0]] = ram[number];
    } else if ( Object.keys(registers).indexOf(operands[1]) > -1 ) {
      var number = registers[operands[1]];
      if ( number >= ram.length ) throw new Error("RAM indexed out of bounds");
      registers[operands[0]] = ram[number];
    } else {
      throw new Error("Invalid location to load");
    }
  } else if ( name == "str" ) {
    var number = parseInt(operands[1],16);
    if ( number === NaN ) throw new Error("Invalid hex number");
    if ( number >= ram.length ) throw new Error("RAM indexed out of bounds");
    if ( operands[0].startsWith("0x") ) {
      var value = parseInt(operands[0],16);
      if ( value === NaN ) throw new Error("Invalid hex number");
      ram[number] = value;
    } else if ( Object.keys(registers).indexOf(operands[0]) > -1 ) {
      var value = registers[operands[0]];
      ram[number] = value;
    } else {
      throw new Error("Invalid location to load");
    }
  } else if ( name == "push" ) {
    if ( operands[0].startsWith("0x") ) {
      stack.push(parseInt(operands[0],16));
    } else if ( Object.keys(registers).indexOf(operands[0]) > -1 ) {
      stack.push(registers[operands[0]]);
    } else {
      throw new Error("Invalid location to load");
    }
  } else if ( name == "pop" ) {
    if ( stack.length <= 0 ) throw new Error("Cannot pop empty stack");
    registers[operands[0]] = stack.pop();
  } else if ( name == "add" ) {
    simpleOperation(operands,(a,b) => a + b);
  } else if ( name == "sub" ) {
    simpleOperation(operands,(a,b) => a - b);
  } else if ( name == "mul" ) {
    simpleOperation(operands,(a,b) => a * b);
  } else if ( name == "div" ) {
    simpleOperation(operands,(a,b) => Math.floor(a / b));
  } else if ( name == "mod" ) {
    simpleOperation(operands,(a,b) => a % b);
  } else if ( name == "inc" ) {
    registers[operands[0]]++;
  } else if ( name == "dec" ) {
    registers[operands[0]]--;
  } else if ( name == "and" ) {
    simpleOperation(operands,(a,b) => a & b);
  } else if ( name == "orr" ) {
    simpleOperation(operands,(a,b) => a | b);
  } else if ( name == "xor" ) {
    simpleOperation(operands,(a,b) => a ^ b);
  } else if ( name == "cmp" ) {
    if ( operands[1].startsWith("0x") ) {
      var number = parseInt(operands[1],16);
      if ( number === NaN ) throw new Error("Invalid hex number");
      flags = {
        equal: registers[operands[0]] == number,
        less: registers[operands[0]] < number,
        greater: registers[operands[0]] > number
      }
    } else if ( Object.keys(registers).indexOf(operands[1]) > -1 ) {
      flags = {
        equal: registers[operands[0]] == registers[operands[1]],
        less: registers[operands[0]] < registers[operands[1]],
        greater: registers[operands[0]] > registers[operands[1]]
      }
    } else {
      throw new Error("Invalid location to load");
    }
  } else if ( name == "jmp" ) {
    executeJump(operands[0]);
  } else if ( name == "je" ) {
    if ( flags.equal ) executeJump(operands[0]);
  } else if ( name == "jne" ) {
    if ( ! flags.equal ) executeJump(operands[0]);
  } else if ( name == "jlt" ) {
    if ( flags.less ) executeJump(operands[0]);
  } else if ( name == "jgt" ) {
    if ( flags.greater ) executeJump(operands[0]);
  } else if ( name == "call" ) {
    stack.push(instructionPointer);
    executeJump(operands[0]);
  } else if ( name == "ret" ) {
    instructionPointer = stack.pop();
  } else if ( name == "int" ) {
    var number = parseInt(operands[0],16);
    if ( number === NaN ) throw new Error("Invalid hex number");
    for ( var i = 0; i < drivers.length; i++ ) {
      if ( drivers[i][operands[0]] ) {
        drivers[i][operands[0]]();
      }
    }
  }
  instructionPointer++;
}

function simpleOperation(operands,func) {
  if ( operands[1].startsWith("0x") ) {
    var number = parseInt(operands[1],16);
    if ( number === NaN ) throw new Error("Invalid hex number");
    registers[operands[0]] = func(registers[operands[0]],number);
  } else if ( Object.keys(registers).indexOf(operands[1]) > -1 ) {
    registers[operands[0]] = func(registers[operands[0]],registers[operands[1]]);
  } else {
    throw new Error("Invalid location to load");
  }
}

function executeJump(point) {
  if ( point.startsWith("0x") ) {
    var number = parseInt(point,16);
    if ( number === NaN ) throw new Error("Invalid hex number");
    if ( number >= programData.length ) throw new Error("Program data indexed out of bounds");
  } else {
    var number = programData.indexOf(point + ":");
    if ( number <= -1 ) throw new Error("Invalid jump point");
  }
  instructionPointer = number - 1;
}

function loadMetadata() {
  var scanningRAM = false;
  var toAllocate = 0;
  for ( var i = 0; i < programData.length; i++ ) {
    if ( scanningRAM ) {
      for ( var j = 0; j < programData[i].length; j++ ) {
        if ( programData[i].charCodeAt(j) == 10 ) continue;
        if ( programData[i].charAt(j) == "\\" ) {
          ram.push(parseInt(programData[i].charAt(j + 1) + programData[i].charAt(j + 2),16));
          j += 2;
        } else {
          ram.push(programData[i].charCodeAt(j));
        }
      }
    }
    if ( programData[i] == "%section ram" ) scanningRAM = true;
    if ( programData[i].startsWith("%load") ) drivers.push(require("./" + programData[i].split(" ")[1])(registers,stack,ram,flags,processorMode));
    if ( programData[i].startsWith("%global") ) {
      var number = programData.indexOf(programData[i].split(" ")[1] + ":");
      if ( number <= -1 ) throw new Error("Invalid jump point");
      instructionPointer = number;
    }
    if ( programData[i].startsWith("%malloc") ) {
      var number = parseInt(programData[i].split(" ")[1],16);
      if ( number === NaN ) throw new Error("Invalid hex number");
      toAllocate = number;
    }
    if ( programData[i] == "%end" ) break;
  }
  ram = ram.concat("0".repeat(toAllocate).split("").map(item => 0));
}

function startProcessor() {
  fs.readFile(process.argv[2],function(err,data) {
    if ( err ) throw err;
    programData = data.toString().trim().split("\n").map(item => item.trim());
    loadMetadata();
    setInterval(function() {
      while ( true ) {
        if ( processorMode[0] == 0 ) {
          executeInstruction(programData[instructionPointer]);
          if ( instructionPointer >= programData.length ) process.exit();
          if ( process.argv.indexOf("--debug") > -1 ) process.stderr.write(JSON.stringify(registers) + " " + instructionPointer + "\n");
        } else {
          break;
        }
      }
    },10);
  });
}

process.stdin.setRawMode(true);
process.stdin.resume();
process.stdin.setEncoding("utf8");
process.stdin.on("data",function(key) {
  if ( key == "\u0003" ) {
    process.stdout.write("\033[0m");
    process.exit();
  }
  if ( processorMode[0] == 1 || processorMode[0] == 2 ) {
    registers.al = key.charCodeAt(0);
    if ( processorMode[0] == 1 ) process.stdout.write(key);
    else if ( registers.dl > 0 ) process.stdout.write(String.fromCharCode(registers.dl));
    processorMode[0] = 0;
  }
});

startProcessor();
