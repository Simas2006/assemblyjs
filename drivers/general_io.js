/*
0x0 - Exit using exit code
0x1 - Print character
0x2 - Set color in terminal (https://i.stack.imgur.com/KTSQa.png)
0x3 - Clear screen
0x4 - Read one character input
0x5 - Read one character input with mask
0x6 - Sleep execution
0x7 - Get time in milliseconds
0x8 - Get random number 0-99
*/

module.exports = function(registers,stack,ram,flags,processorMode) {
  return {
    "0x0": _ => {
      process.exit(registers.al);
    },
    "0x1": _ => {
      process.stdout.write(String.fromCharCode(registers.al));
    },
    "0x2": _ => {
      if ( registers.al >= 256 ) {
        process.stdout.write("\033[0m");
      } else {
        process.stdout.write("\033[0;38;5;" + registers.al + "m");
      }
    },
    "0x3": _ => {
      process.stdout.write("\033c");
    },
    "0x4": _ => {
      processorMode[0] = 1;
    },
    "0x5": _ => {
      processorMode[0] = 2;
    },
    "0x6": _ => {
      processorMode[0] = 3;
      setTimeout(function() {
        processorMode = 0;
      },registers.al);
    },
    "0x7": _ => {
      registers.al = new Date().getTime();
    },
    "0x8": _ => {
      registers.al = Math.floor(Math.random() * 100);
    }
  }
}
