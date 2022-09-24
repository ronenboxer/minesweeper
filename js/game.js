'use strict'

//DOM
const MINE_IMG = `<iconify-icon inline icon="bxs:bomb" style="color: white;" width="24"></iconify-icon>`
const FLAG_IMG = `<iconify-icon icon="charm:flag" width="20px"></iconify-icon>`
const LOSE_IMG = `<iconify-icon icon="cil:face-dead" width="28px"></iconify-icon>`
const WIN_IMG = `<iconify-icon icon="akar-icons:trophy" width="30px"></iconify-icon>`
const START_IMG = `<iconify-icon icon="bx:happy" width="31px"></iconify-icon>`
const LIFE_IMG = `<iconify-icon inline icon="bi:heart-fill" width="24px"></iconify-icon>`
const HINT_IMG = `<iconify-icon inline icon="academicons:ideas-repec" width="24px" onclick="onHint()"></iconify-icon>`
const SAFE_IMG = `<iconify-icon inline icon="ion:help-buoy-sharp" width="24px" onclick="useUtility('safe')"></iconify-icon>`
const EL_START_BUTTON = document.querySelector('#start-button')
const EL_MANUAL_BUTTON = document.querySelector('#manual')
const EL_BEST = document.querySelector(`#best-score span`)
const EL_FLAGS_LEFT = document.querySelector('.flags-left')
const EL_H3 = document.querySelector('h3')


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



// a new game
function initGame(level = null) {
    clearInterval(timerIntervalId)
    isProccessing = false
    EL_START_BUTTON.classList.remove('win')
    renderValue(EL_H3, '')
    EL_H3.style.opacity = 1
    if (!level) return

    // sets buttons to start
    renderImg(EL_START_BUTTON, START_IMG)
    if (!level) renderImg(EL_FLAGS_LEFT, FLAG_IMG)
    else renderValue(EL_FLAGS_LEFT, gLevel.MINES)
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

        //hint mode
        isHitOn: false,
        isMegaHintOn: false,
        megaHintFirstPos: null,

        //undo stack
        stateStack: [],
    }

    //DOM
    document.querySelector('.time').innerText = '00 : 00'
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
}



// sets level according to user choice
function onSetLevel(evt, level) {
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
        case defualt: return null
    }

    const tablinks = document.getElementsByClassName("tablinks");
    for (var i = 0; i < tablinks.length; i++) {
        tablinks[i].className = tablinks[i].className.replace(" active", "");
    }

    evt.currentTarget.className += " active";
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
    if (!gGame.life) revealAllMines()
    else {
        if (!isMute) playUtilSound('life')
        gGame.life--
        renderUtils('life')
        gGame.markedCount++
        // gGame.shownCount--
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
        if (!isMute) playUtilSound('win')
        gameOver()
    }
}

renderValue(EL_BEST, getBestTime(gGame.level))
renderImg(EL_START_BUTTON, WIN_IMG)



// turning 7 boom mode on start and placing mines accordingly
function onSevenBoom() {
    is7Boom = true;
    initGame(true)

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

    // update neighbours, model
    setMinesNegsCount(gBoard)
    gGame.isOn = true
    gGame.startTime = Date.now()
    timerIntervalId = setInterval(renderTime, 1000)
}



// toggle manual position feature:
// first click is to position, second to stop positioning
function onManualPosition(elButton) {
    if (!gLevel) return
    // mode turned on, reset board
    if (!isManualPositionOn) {
        initGame(gGame.level)
        renderImg(EL_FLAGS_LEFT, FLAG_IMG)
        isManualPositionOn = true
        renderValue(elButton, 'all done') // update button
    } else { // player done positioning mines
        if (gGame.minePos.length) { // making sure player indeed placed mines
            for (var i = 0; i < gGame.minePos.length; i++) {
                const currPos = gGame.minePos[i]
                const elCell = getElementByPos(currPos.row, currPos.col)
                elCell.classList.remove('mine')
                setMinesNegsCount(gBoard)
                isManualPositionOn = false;
                gGame.isOn = true
            }
        } else initGame(gGame.level) // otherwise start a regular game
        renderValue(elButton, 'position myself') // update button
    }

}


// updates model when player uses a regular hint, it turns the isHintOn mode on
// to let the cellClicked functions know not to step on cell
function onHint() {
    if (!gGame.isOn || gGame.isMegaHintOn) return
    saveCurrState()
    gGame.isHitOn = true
}



// updates model when player uses a mega hint, it turns isMegaHintOn mode on
// to let cellClicked function know not to step on two next cells
function onMegaHint() {
    if (!gGame.isOn || !gGame.mega || gGame.megaHintFirstPos) return
    saveCurrState()
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
    gGame.mega--
}



// removes up to 3 unstepped on mines, should they exist (randomly)
function exterminate() {
    // lets plyaer use this feature once, only when game is on
    if (gGame.usedExterminate || !gGame.isOn) return
    // plays audio if mute mode is off
    if (!isMute) playUtilSound('exterminate')


    //updates model
    gGame.usedExterminate = true
    var minePos = getUnmarkedMine() // array of minesw coordinations that fit condition
    const unmarkedMinesCount = minePos.length // array length - mines amount

    // DOM - update player about amount of mines removed
    if (unmarkedMinesCount >= 3) renderValue(EL_H3, '3 random mines were eliminated')
    else if (unmarkedMinesCount === 1) renderValue(EL_H3, '1 random mine was eliminated')
    else renderValue(EL_H3, unmarkedMinesCount + ` random mines were eliminated`)

    // hide h3, clears is iiner text and restores its opacity
    setTimeout(() => {
        EL_H3.style.opacity = 0
        setTimeout
    }, 2000)

    for (var i = 0; i < unmarkedMinesCount && i < 3; i++) {
        const randomIdx = getRandomInt(0, minePos.length)
        const currMinePos = minePos.splice(randomIdx, 1)[0]
        const idxInGgame = getIndex(currMinePos, gGame.minePos)
        gBoard[currMinePos.row][currMinePos.col].isMine = false;
        gGame.minePos.splice(idxInGgame, 1)
    }

    // updating model and DOM if necessary
    setMinesNegsCount(gBoard)
    renderFlagsLeft()
    saveCurrState()
    checkGameOver()
}