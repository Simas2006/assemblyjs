# assemblyjs

AssemblyJS: An assembly interpreter written in JavaScript because getting assembly to actually work, and then memorizing all the syscalls is annoying.

(Note: assemblyjs only accepts hexadecimal numbers)

### How to Use

Write your code (the Code) in a file with an extension of `.assembly`, then simply run `node index.js <filename>.assembly`. Add the `--debug` flag to see the registers after every instruction.

### Codebase Layout

The Codebase is be layed out as follows:

```
<preprocessor commands>

%section prog
<jump point>:
  <basic instructions>

%section ram
<ram data>

%end
```

### Machine Memory Layout

The Machine's memory consists of:
  - The Codebase
  - Pre-initialized RAM (array)
  - 8 Registers (al, ah, bl, ..., dh) (object)
  - The Stack (array)
  - Flags (object)
  - The Instruction Pointer (int)
  - The Processor Mode (length 1 array)
  - The Driver Codebases (array)

#### RAM formatting

If normal characters can be inserted in the RAM space, they will be converted to their ASCII codes and inserted into RAM. Special characters may be inserted by typing `\`, and then inserting the character's ASCII code (in hexadecimal).

### Basic Instruction Set

Instruction|Operands                            |Result
-----------|------------------------------------|------
MOV        |&lt;register>,&lt;register or value>|Copies the value in OP 1 to OP 2
LOAD       |&lt;register>,&lt;register or value>|Loads the RAM value indexed with OP 2 into OP 1
STR        |&lt;register>,&lt;register or value>|Stores the value in OP 1 into RAM indexed with OP 2
PUSH       |&lt;register or value>              |Pushes the value in OP 1 to the stack
POP        |&lt;register>                       |Pops the value at the top of the stack into OP 1
CALL       |&lt;subroutine>                     |Jumps to the subroutine signified by OP 1 and saves the return index
RET        |                                    |Returns to the top return index + 1
INT        |&lt;interrupt ID>                   |Calls an interrupt defined in drivers
ADD        |&lt;register>,&lt;register or value>|Adds the values in OP 1 and OP 2 and stores into OP 1
SUB        |&lt;register>,&lt;register or value>|Subtracts the value in OP 1 with OP 2 and stores into OP 1
MUL        |&lt;register>,&lt;register or value>|Multiplies the values in OP 1 and OP 2 and stores into OP 1
DIV        |&lt;register>,&lt;register or value>|Divides the value in OP 1 by OP 2 and stores into OP 1
MOD        |&lt;register>,&lt;register or value>|Calculates the remainder of the division of the value in OP 1 by OP 2 and stores into OP 1
INC        |&lt;register>                       |Increments the value in OP 1
DEC        |&lt;register>                       |Decrements the value in OP 1
AND        |&lt;register>,&lt;register or value>|Calculates bitwise AND of the values of OP 1 and OP 2 and stores into OP 1
ORR        |&lt;register>,&lt;register or value>|Calculates bitwise OR of the values of OP 1 and OP 2 and stores into OP 1
XOR        |&lt;register>,&lt;register or value>|Calculates bitwise XOR of the values of OP 1 and OP 2 and stores into OP 1
CMP        |&lt;register>,&lt;register or value>|Compares the values in OP 1 and OP 2 and sets flags accordingly
JMP        |&lt;subroutine>                     |Jumps to subroutine without saving return address unconditionally
JEQ        |&lt;subroutine>                     |Jumps to subroutine if equal flag is set
JNE        |&lt;subroutine>                     |Jumps to subroutine if equal flag is not set
JLT        |&lt;subroutine>                     |Jumps to subroutine if less flag is set
JGT        |&lt;subroutine>                     |Jumps to subroutine if greater flag is set

### Preprocessor Instructions

#### %section &lt;prog | ram>
Required (if prog). Declares sections in the Codebase.

`%section prog` will be executed. If `%global` is not declared, the first instruction will be executed first.

`%section ram` initializes RAM before execution of code. If `%malloc` is not declared, the amount of RAM available shall be the same as the length of this data.

##### %end
Declares the end of the Codebase. Any text can be written after this instruction; it will not be interpreted as code or RAM.

#### %load &lt;driver>
Includes drivers into the Codebase.

Drivers are standard JS modules, with `module.exports` as its only function. It should return an object, which will be keyed using a hexadecimal string and should then return a function to run. Place drivers in the `drivers/` folder to make them accessible.

#### %global &lt;subroutine>
Declares the subroutine to be run when the Machine starts executing code. If not present, execution will begin at the first instruction.

#### %malloc &lt;amount>
Declares the amount of RAM to create by filling with zeros. If `%section ram` is declared, only the remainder of RAM will be filled with zeros.

### Basic Interrupt Set

ID |Action
---|-----------------------------------------------------------------------------------
0x0|Exit using the code in the AL register
0x1|Print the ASCII character in the AL register
0x2|Set the terminal color by the AL register (see https://i.stack.imgur.com/KTSQa.png)
0x3|Print clear screen character
0x4|Read one character from input
0x5|Read one character from input with input signified by AL register
0x6|Sleep execution for milliseconds according to AL register
0x7|Stores Epoch time into AL register
0x8|Stores random number from 0-99 into AL Register
