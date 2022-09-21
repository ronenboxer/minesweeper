'use strict'

// when player reveals a cell
function cellClicked(elCell, row, col) {
    //model
    const currCell = gBoard[row][col]
    if (currCell.isMarked || currCell.isUnkown) return
    if (!gGame.shownCount) {
        getRandomMinesPos({ row: row, col: col })
        gGame.isOn = true
        gGame.startTime = Date.now()
        timerIntervalId = setInterval(renderTime, 1000)
    } else if (!gGame.isOn) return

    //model and DOM
    if (gBoard[row][col].isMine) {
        if (!gGame.life) revealAllMines()
        else revealMine(elCell, row, col)
    } else {
        expandShown(gBoard, elCell, row, col)
        const minesAroundCount = gBoard[row][col].minesAroundCount
        const flagsAroundCount = getNegsCountByKey(gBoard, { row: row, col: col }, 'isMarked')
        if (minesAroundCount && minesAroundCount === flagsAroundCount) {
            const minesCount = showAllNegs(gBoard, row, col)
            if (minesCount) revealAllMines(gBoard)
        }
    }
    checkGameOver()
}

// when user tight-clicks. they can make an unbomed cell makred with a flag, a `?` or delete the mark
function cellMarked(elCell, row, col) {
    const currCell = gBoard[row][col]
    if (!gGame.isOn || currCell.isShown) return
    if (currCell.isMarked) {
        //model
        currCell.isMarked = false
        currCell.isUnkown = true
        //DOM
        renderValue(elCell, '?')
        gGame.markedCount--
    } else if (currCell.isUnkown) {
        //model
        currCell.isUnkown = false
        //DOM
        renderValue(elCell, '')
        
    } else {
        //model
        gGame.markedCount++
        currCell.isMarked = true
        //DOM
        renderImg(elCell, FLAG_IMG)
    }
    checkGameOver()
}

// a function that reveals neighbours cells with 0 mined neighbours
function expandShown(board, elCell, row, col) {
    const minesAroundCount = board[row][col].minesAroundCount
    if (!board[row][col].isShown) stepOnCell(board, elCell, row, col) //model
    if (minesAroundCount) {
        renderValue(elCell, minesAroundCount) //DOM - shows numbers bigger than 0
        return
    }

    for (var i = row - 1; i <= row + 1; i++) {
        if (i < 0 || i > gGame.SIZE - 1) continue
        for (var j = col - 1; j <= col + 1; j++) {
            if (j < 0 || j > gGame.SIZE - 1 ||
                (i === row && j === col)) continue
                if (board[i][j].isShown) continue
            const elCurrCell = getElementByPos(i, j)
            expandShown(board, elCurrCell, i, j)
        }
    }
}

// updates DOM
function stepOnCell(board, elCell, row, col) {
    elCell.classList.add('safe')
    board[row][col].isShown = true
    gGame.shownCount++
}