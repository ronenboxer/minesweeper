# Mine Sweeper Game
[Try it out](https://ronenboxer.github.io/minesweeper)

![minesweeper](https://user-images.githubusercontent.com/114055513/231570285-8a0defd9-bb06-4b47-8e36-289a74b28423.gif)

<hr>

[Rules](#rules) 
<br>
[Added Features](#added-features) <br>
[Game Modes](#game-modes)

### Rules
- The game is played on a "field", shown as a table. Each table cell is either covering a bomb, or it is safe to step on.
- The game begins fter the first click (first click is always safe except special modes: 7BOOM and manual).
- The goal is to uncover all the safe cells and mark the mined ones with a flag by hitting the right click. Each right click toggles between unmarked, flagged and unkown state, and is only available for uncovered cells.
- The number of mines is displayed on the top left, and updtes on any click. When a safe cell is clicked, it will display the numbers of neighboring mines around it, should they exist.

### Added Features
- 3 lives, displayed on the left side.
- 3 hints: Click on the bulb icon, and then select any cell on the field (preferably an unknown one, not close to the edges - for best usage). The selected cell with its neighbors will reveal what lies beneath them for a short time.
- 3 safe clicks: When clicked, a random unmined cell will flicker for a short time, as long as there is one.
- Mega hint: This feature will expose all cells between a given border for a short time. Click on the maginfying glass icon, then select 2 cells. The rectangle that can be bloacked by selected cells will apply mega hint on the cells inside it.
- Exterminate: When the gun icon is clicked, up to 3 random unflagged mines will be removed, show they exist.
- Dark/light mode switch.
- Mute toggle switch is located on the right to the game header.
- Unde/redo buttons are located on the left to the game heaer.

### Game Modes
- Easy: 4 X 4 cells with 2 mines.
- Medium: 8 X 8 cells with 14 mines.
- Hard: 12 X 12 cells with 32 mines.
- 7BOOM: 12 X 12 cells with mines positioned on any number that can be devided by 7 (including), or that has 7 in its digits. These numbers reprresent cells' indexes from top left to bottom right.
- Manual: 12 X 12 cells with mines positioned as desired. Game will begin when 'all done' button is clicked (placed on the manual mode button).
