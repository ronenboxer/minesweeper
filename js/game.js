'use strict'

//DOM
const MINE_IMG = `<iconify-icon inline icon="bxs:bomb" class="mines" width="20px"></iconify-icon>`
const FLAG_IMG = `<iconify-icon icon="charm:flag" class="flags" width="15px"></iconify-icon>`
const LOSE_IMG = `<iconify-icon icon="cil:face-dead" width="2vw"></iconify-icon>`
const WIN_IMG = `<iconify-icon icon="akar-icons:trophy" width="2vw"></iconify-icon>`
const START_IMG = `<iconify-icon icon="bx:happy" width="2vw"></iconify-icon>`
const LIFE_IMG = `<iconify-icon inline title="if you see it, you're good" icon="bi:heart-fill" width="1.5vw"></iconify-icon>`
const HINT_IMG = `<iconify-icon inline title="click here, and then on any cell"icon="academicons:ideas-repec" width="1.5vw" onclick="onHint()"></iconify-icon>`
const MEGA_HINT_IMG = `<iconify-icon inline title="click here, then pick 2 cells" icon="mdi:magnify-expand" width="1.5vw" onclick="onMegaHint()"></iconify-icon>`
const EXTERMINATE_IMG = `<iconify-icon inline title="get rid of up to 3 mines" icon="fa6-solid:gun" width="1.5vw" onclick="exterminate()" id="exterminate"></iconify-icon>`
const SAFE_IMG = `<iconify-icon inline title="show a safe cell" icon="ion:help-buoy-sharp" width="1.5vw" onclick="useUtility('safe')"></iconify-icon>`
const LIGHT_MODE = `<iconify-icon inline title="is it too dark?" icon="cil:sun" width="1.5vw" onclick="toggleLight('')"></iconify-icon>`
const DARK_MODE = `<iconify-icon inline title="now it's too damn bright!" icon="bi:moon-stars" width="1.5vw" onclick="toggleLight('')"></iconify-icon>`
const EL_START_BUTTON = document.querySelector('#start-button')
const EL_MANUAL_BUTTON = document.querySelector('#manual')
const EL_BEST = document.querySelector(`#best-time span`)
const EL_FLAGS_LEFT = document.querySelector('.flags-left')
const EL_H3 = document.querySelector('h3')
const EL_TOGGLE_MODE = document.querySelector(`#toggle-mode`)


// model
const MINE = `*`

var gBoard = []
var gLevel = null
var gGame = {}
var timerIntervalId
var is7Boom = false
var isProccessing
var isMute = false
var isManualPositionOn = false
var isDark = true
var stateStackIdx
var undoStrike

// sounds
const MEGA_HINT_SOUND = new Audio(`sound/win.wav`)
const LOSE_SOUND = new Audio(`sound/lose.wav`)
const HINT_SOUND = new Audio(`sound/hint.wav`)
const SAFE_CLICK_SOUND = new Audio(`sound/safe_click.wav`)
const WIN_SOUND = new Audio(`sound/mega_hint.wav`)
const ONE_LIFE_DOWN_SOUND = new Audio(`sound/one_life_down.wav`)
const UNDO_SOUND = new Audio(`sound/undo.wav`)
const EXTERMINATE_SOUND = new Audio(`sound/exterminate_sound.wav`)


renderImg(EL_START_BUTTON, START_IMG)
renderImg(EL_FLAGS_LEFT, FLAG_IMG)
EL_TOGGLE_MODE.innerHTML = `<span>${LIGHT_MODE}</span> light mode`

// a new game
function initGame(level = null) {
    clearInterval(timerIntervalId)
    isProccessing = false
    EL_START_BUTTON.classList.remove('win')
    renderImg(EL_START_BUTTON, START_IMG)
    renderValue(EL_H3, '')
    EL_H3.style.opacity = 1
    if (!level) return

    // EL_MANUAL_BUTTON.style.visibility = `visible`

    //model
    isManualPositionOn = false
    is7Boom = false

    gGame = {
        // game data
        isOn: false,
        level: level,
        shownCount: 0,
        markedCount: 0,
        secsPassed: 0,
        minePos: [],
        startTime: 0,

        // hints counter
        life: 3,
        hint: 3,
        safe: 3,
        mega: 1,
        exterminate: 1,

        //hint mode
        isHitOn: false,
        isMegaHintOn: false,
        megaHintFirstPos: null,

        //undo stack
        stateStack: []
    }

    //DOM
    document.querySelector('#time span').innerText = '00 : 00'
    buildBoard()
    renderBoard()

    // disabling right click menu
    const elCells = document.querySelectorAll('.cell')
    for (var i = 0; i < elCells.length; i++) {
        elCells[i].addEventListener("contextmenu", function (e) {
            e.preventDefault()
        })
    }

    // shows how many hints or lives a player has
    renderUtils('life')
    renderUtils('hint')
    renderUtils('safe')
    renderUtils('mega')
    renderUtils('exterminate')
    stateStackIdx = -1
    undoStrike = false
    // saveCurrState()
}



// sets level according to user choice
function onSetLevel(level) {
    if (gGame.level) document.getElementById(gGame.level).classList.remove(`active`)
    if (isManualPositionOn) {
        renderValue(EL_MANUAL_BUTTON, 'manual') // update button
        EL_MANUAL_BUTTON.classList.remove('active')
    }
    switch (level) {
        case 'easy':
            gLevel = { SIZE: 4, MINES: 2 }
            break
        case 'medium':
            gLevel = { SIZE: 8, MINES: 14 }
            break
        case 'hard':
            gLevel = { SIZE: 12, MINES: 32 }
            break
        case '7boom':
            if (!gLevel) return
            onSevenBoom()
            return
        case 'manual':
            if (!gLevel) return
            onManualPosition()
            return
        case defualt: return null
    }

    document.getElementById(level).classList.add(`active`)

    renderValue(EL_FLAGS_LEFT, gLevel.MINES)
    renderValue(EL_BEST, getBestTime(level))
    initGame(level)
}



// clean board on model
function buildBoard() {
    gBoard = []
    for (var i = 0; i < gLevel.SIZE; i++) {
        gBoard[i] = []
        for (var j = 0; j < gLevel.SIZE; j++) {
            gBoard[i][j] = {
                minesAroundCount: 0,
                isShown: false,
                isMine: false,
                isMarked: false,
                isUnknown: false
            }
        }
    }
}



// positions mines randomlly besides the first clicked cell. model only
function getRandomMinesPos(row, col) {

    // array of possible cells for mines
    var mines = []
    for (var i = 0; i < gLevel.SIZE; i++) {
        for (var j = 0; j < gLevel.SIZE; j++) {
            if (row === i && col === j) continue
            mines.push({ row: i, col: j })
        }
    }

    // choose the right amount of cells to place mine in them
    for (var i = 0; i < gLevel.MINES; i++) {
        const randomMineIdx = getRandomInt(0, mines.length)
        const randomMine = mines.splice(randomMineIdx, 1)[0]

        gGame.minePos.push({ row: randomMine.row, col: randomMine.col })
        gBoard[randomMine.row][randomMine.col].isMine = true

    }

    // update model board's cells with the amount fo mined neighbours
    setMinesNegsCount(gBoard)
}




// sets each cell with number of mined neighbours. model only
function setMinesNegsCount(board) {
    for (var i = 0; i < gLevel.SIZE; i++) {
        for (var j = 0; j < gLevel.SIZE; j++) {
            const minesCount = getNegsCountByKey(board, { row: i, col: j }, 'isMine')
            const currCell = board[i][j]
            const elCurrCell = getElementByPos(i, j)

            // this condition is relevnt for when player uses exterminate utility
            // if a cell is shown, not a mine, has more than 0  mined neigbours
            // and the new amonut of mined around it is different than model, we upate DOM
            if (currCell.isShown && !currCell.isMine && minesCount &&
                currCell.minesAroundCount !== minesCount) renderValue(elCurrCell, minesCount)
            if (currCell.isShown && !currCell.isMine && !minesCount &&
                !currCell.isMarked && !currCell.isUnknown) {
                renderValue(elCurrCell, '')
                currCell.minesAroundCount = minesCount
                expandShown(gBoard, elCurrCell, i, j)
            } else currCell.minesAroundCount = minesCount
        }
    }
}




// renders board. DOM only
function renderBoard() {
    const elBoard = document.querySelector(`.board`)
    var strHTML = `<tbody>`
    for (var i = 0; i < gLevel.SIZE; i++) {
        strHTML += `<tr>`
        for (var j = 0; j < gLevel.SIZE; j++) {
            strHTML += `<td onclick="cellClicked(this, ${i}, ${j})"`
            strHTML += ` oncontextmenu="cellMarked(this, ${i}, ${j})" `
            strHTML += `class="cell " data-row="${i}" data-col="${j}"></td>`
        }
        strHTML += `</tr>`
    }
    strHTML += `</tbody>`
    elBoard.innerHTML = strHTML
}



// stops the game
function gameOver() {
    gGame.isOn = false;
    if (is7Boom) is7Boom = false
    clearInterval(timerIntervalId)
    document.getElementById(gGame.level).classList.add(`active`)
}



// runs when player loses and they don't have a spare life, they get to see al the mines
function revealAllMines() {
    if (!isMute) playUtilSound('lose')
    for (var i = 0; i < gGame.minePos.length; i++) {
        const currMineCell = gGame.minePos[i]
        gBoard[currMineCell.row][currMineCell.col].isShown = true
        const elMineCell = getElementByPos(currMineCell.row, currMineCell.col)
        elMineCell.classList.add('mine')
        renderImg(elMineCell, MINE_IMG)
    }
    renderImg(EL_START_BUTTON, LOSE_IMG)
    gameOver()
}



// if a player loses a life, this function shows the mine they just stepped on, and updates model and DOM
function revealMine(elCell, row, col) {// if player has no more life left, reveal all mines and end game
    gGame.life--
    renderUtils('life')
    if (!gGame.life) revealAllMines()
    else {
        if (!isMute) playUtilSound('life')
        gGame.markedCount++
        const mineCell = gBoard[row][col]
        mineCell.isShown = true
        mineCell.isMarked = true
        elCell.classList.add('mine-marked')
        renderImg(elCell, MINE_IMG)
    }
}



// runs after each cell click, or model rendering function, like exterminate
function checkGameOver() {
    if (gGame.markedCount + gGame.shownCount === gLevel.SIZE ** 2 &&
        gGame.markedCount === gGame.minePos.length) {
        setBestTime(gGame.level)
        EL_START_BUTTON.classList.add("win")
        gGame.stateStack = null
        renderValue(EL_BEST, getBestTime(gGame.level))
        renderImg(EL_START_BUTTON, WIN_IMG)
        if (!isMute) playUtilSound('win')
        gameOver()
        return true
    }
    return false
}



// turning 7 boom mode on start and placing mines accordingly
function onSevenBoom() {
    initGame('7boom')
    is7Boom = true;
    document.getElementById('7boom').classList.add(`active`)

    for (var i = 0; i < gLevel.SIZE; i++) {
        for (var j = 0; j < gLevel.SIZE; j++) {
            const currIdx = i * gLevel.SIZE + j // 7 BOOM index

            if (!(currIdx % 7) || // if index is divided by 7
                parseInt(currIdx / 10) === 7 || // if index is between 70 and 79
                currIdx % 10 === 7) { //if index has 7 in its right digit

                // update model
                gGame.minePos.push({ row: i, col: j })
                gBoard[i][j].isMine = true;
            }
        }
    }
    gLevel.MINES = gGame.minePos.length
    // update neighbours, model
    setMinesNegsCount(gBoard)
    renderValue(EL_FLAGS_LEFT, gLevel.MINES)
    renderValue(EL_BEST, getBestTime(gLevel.level))
    gGame.isOn = true
    gGame.startTime = Date.now()
    timerIntervalId = setInterval(renderTime, 1000)
}



// toggle manual position feature:
// first click is to position, second to stop positioning
function onManualPosition() {
    if (!gLevel) return
    // mode turned on, reset board
    if (!isManualPositionOn) {
        initGame(gGame.level)
        renderImg(EL_FLAGS_LEFT, FLAG_IMG)
        isManualPositionOn = true
        EL_MANUAL_BUTTON.classList.add('active')
        document.getElementById(gGame.level).classList.remove(`active`)
        renderValue(EL_MANUAL_BUTTON, 'all done') // update button
    } else { // player done positioning mines
        if (gGame.minePos.length) { // making sure player indeed placed mines
            for (var i = 0; i < gGame.minePos.length; i++) {
                const currPos = gGame.minePos[i]
                const elCell = getElementByPos(currPos.row, currPos.col)
                elCell.classList.remove('mine')
                setMinesNegsCount(gBoard)
                gLevel.MINES = gGame.minePos.length
                renderValue(EL_FLAGS_LEFT, gLevel.MINES)
                renderValue(EL_BEST, getBestTime(gLevel.level))
                isManualPositionOn = false;
                gGame.isOn = true
            }
        } else {
            document.getElementById(gGame.level).classList.add(`active`)
            initGame(gGame.level) // otherwise start a regular game
        }
        renderValue(EL_MANUAL_BUTTON, 'manual') // update button
        EL_MANUAL_BUTTON.classList.remove('active')
        document.getElementById(gGame.level).classList.add(`active`)
    }

}


// updates model when player uses a regular hint, it turns the isHintOn mode on
// to let the cellClicked functions know not to step on cell
function onHint() {
    if (!gGame.isOn || gGame.isMegaHintOn) return
    // undoStrike = false
    // gGame.stateStack.splice(stateStackIdx + 1)
    // saveCurrState()
    gGame.isHitOn = true
}



// updates model when player uses a mega hint, it turns isMegaHintOn mode on
// to let cellClicked function know not to step on two next cells
function onMegaHint() {
    if (!gGame.isOn || gGame.megaHintFirstPos) return
    // undoStrike = false
    // gGame.stateStack.splice(stateStackIdx + 1)
    // saveCurrState()
    if (gGame.isHitOn) gGame.isHitOn = false
    gGame.isMegaHintOn = true
}




// gets called when player selected two cells after turning mega hint mode
function showMegaHint(firstPos, secondPos) {
    const elFirstCell = getElementByPos(firstPos.row, firstPos.col)
    const elSecondCell = getElementByPos(secondPos.row, secondPos.col)

    // if one of the cell elements doesn't have a selected class, that means that the user picked the same cell twice
    // turn mega hint mode off, restore model and save the utility for future
    if (!elFirstCell.classList.contains('selected-cell')) {
        gGame.megaHintFirstPos = null
        gGame.isMegaHintOn = false
        return
    }
    // otherwise, orgnizes fictive cells according the players borders
    const rowStart = (firstPos.row < secondPos.row) ? firstPos.row : secondPos.row
    const rowEnd = (firstPos.row > secondPos.row) ? firstPos.row : secondPos.row
    const colStart = (firstPos.col < secondPos.col) ? firstPos.col : secondPos.col
    const colEnd = (firstPos.col > secondPos.col) ? firstPos.col : secondPos.col
    // remove class from selected cell elements
    elFirstCell.classList.toggle('selected-cell')
    elSecondCell.classList.toggle('selected-cell')
    useUtility('mega', { row: rowStart, col: colStart }, { row: rowEnd, col: colEnd })
    gGame.isMegaHintOn = false
    // gGame.mega--
}



// removes up to 3 unstepped on mines, should they exist (randomly)
function exterminate() {
    // lets plyaer use this feature once, only when game is on
    if (!gGame.exterminate || !gGame.isOn) return
    // undoStrike = false
    // gGame.stateStack.splice(stateStackIdx + 1)
    // plays audio if mute mode is off
    if (!isMute) playUtilSound('exterminate')
    gGame.exterminate--
    renderUtils('exterminate')

    // gets untouched mines (array of mines coordinations)
    var minePos = gGame.minePos.filter(minePos => {
        const row = minePos.row
        const col = minePos.col
        return !gBoard[row][col].isShown && !gBoard[row][col].isMarked && !gBoard[row][col].isUnknown
    })
    
    const unmarkedMinesCount = minePos.length // array length - mines amount

    // removes random mines and updating model
    for (var i = 0; i < unmarkedMinesCount && i < 3; i++) {
        const randomIdx = getRandomInt(0, minePos.length)
        const currMinePos = minePos.splice(randomIdx, 1)[0]
        const mineIdx = gGame.minePos.findIndex(mine => mine.row === currMinePos.row && mine.col === currMinePos.col)
        gBoard[currMinePos.row][currMinePos.col].isMine = false;
        gGame.minePos.splice(mineIdx, 1)
    }

    // lets player know homw many mines were removed
    if (unmarkedMinesCount >= 3) renderValue(EL_H3, '3 random mines were eliminated')
    else if (unmarkedMinesCount === 1) renderValue(EL_H3, '1 random mine was eliminated')
    else renderValue(EL_H3, unmarkedMinesCount + ` random mines were eliminated`)

    // hides h3, clears is inner text and restores its opacity
    setTimeout(() => {
        EL_H3.style.opacity = 0
        setTimeout
    }, 2000)

    // updating model and DOM if necessary
    setMinesNegsCount(gBoard)
    renderFlagsLeft()
     if (checkGameOver()) return
    saveCurrState()
}