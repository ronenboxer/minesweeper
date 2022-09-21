'use strict'

// same old
function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min)) + min
}

// returns the number of neighbours that has a key
function getNegsCountByKey(board, pos, key) {
    var count = 0
    for (var i = pos.row - 1; i <= pos.row + 1; i++) {
        if (i < 0 || i > gGame.SIZE - 1) continue
        for (var j = pos.col - 1; j <= pos.col + 1; j++) {
            if (j < 0 || j > gGame.SIZE - 1 ||
                (j === pos.col && i === pos.row)) continue
            if (board[i][j][key]) count++
        }
    }
    return count
}

// shows all neighours of a cell but the cell itslef
function showAllNegs(board, row, col) {
    var minesCount = 0
    for (var i = row - 1; i <= row + 1; i++) {
        if (i < 0 || i > gGame.SIZE - 1) continue
        for (var j = col - 1; j <= col + 1; j++) {
            const currCell = board[i][j]
            if (j < 0 || j > gGame.SIZE - 1 ||
                (j === col && i === row) ||
                currCell.isMarked ||
                currCell.isUnknown ||
                currCell.isShown) continue
            if (currCell.isMine) minesCount++
            const elCell = getElementByPos(i, j)

            stepOnCell(board, elCell, i, j)
            if (currCell.minesAroundCount) {
                renderValue(elCell, currCell.minesAroundCount)
            } else expandShown(board, elCell, i, j)
        }
    }
    return minesCount
}

// returns cell element
function getElementByPos(row, col) {
    return document.querySelector(`[data-row="${row}"][data-col="${col}"]`)
}

// to render strings
function renderValue(element, value) {
    element.innerText = value
}

// to render imgs
function renderImg(element, img) {
    element.innerHTML = img
}

// shows user play time
function renderTime() {
    var currTime = Date.now() - gGame.startTime
    var seconds = parseInt(currTime / 1000)
    gGame.secsPassed = seconds
    seconds %= 60
    var minutes = parseInt(currTime / 60000)
    if (seconds < 10) seconds = '0' + seconds
    if (minutes < 10) minutes = '0' + minutes
    const elTime = document.querySelector('.time')
    elTime.innerText = minutes + ' : ' + seconds
}

// adds/removes a `utiliy` from DOM (such as life, hint click or safe click)
function renderUtils(util) {
    const elLives = document.querySelector(`[id="${util}"] span`)
    var imgStr = ''
    for (var i = 0; i < gGame[util]; i++) {
        switch (util) {
            case 'life':
                imgStr += LIFE_IMG
                break
            case 'hint':
                imgStr += HINT_IMG
                break
            case 'safe':
                imgStr += SAFE_IMG
                break
        }
    }
    renderImg(elLives, imgStr)
}


// returns a random HIDDEN cell. is isMine, that includes mines, otherwise it doesn't
function getRandomHiddenCell(board, isMine) {
    var positions = []
    const startRowIdx = (isMine) ? 1 : 0
    const startColIdx = (isMine) ? 1 : 0
    const endRowIdx = (isMine) ? board.length - 1 : board[0].length
    const endColIdx = (isMine) ? board[0].length - 1 : board[0].length
    for (var i = startRowIdx; i < endRowIdx; i++) {
        for (var j = startColIdx; j < endColIdx; j++) {
            if (!board[i][j].isShown) {
                if (isMine) positions.push({ row: i, col: j })
                else if (!board[i][j].isMine) positions.push({ row: i, col: j })
            }
        }
    }
    var randomIdx = getRandomInt(0, positions.length)
    return positions.splice(randomIdx, 1)[0]
}