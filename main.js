let global = {
  keys: []
};

let Settings = {
  CELL_WIDTH: 100,
  CELL_HEIGHT: 100,
  CELL_MARGIN: 6
};

// ゲームの状態を管理するクラス
class State {
  constructor() {
    // 4 * 4 行列で, 各要素にどういう要素が入っているかを管理する
    this.board = [];
    // move したときに, 例えば 2 と 2 がくっついたりして merge されたかどうかを管理する
    this.merge = [];
    // move したときに, 動いたセルはどこからどこへ行ったのか
    this.moveCells = [];
    // move があった際に, どこかの要素が動いたかどうかを判定する
    this.isMove = false;
    for (let i = 0; i < 16; i++) {
      this.board.push(0);
      this.merge.push(false);
    }
  }
  // 指示された方向に動いた際の次の State を求める
  calcNextState(dir) {
    nextState = new State();
    // コピーする
    for (let i = 0; i < 16; i++) {
      nextState.board[i] = this.board[i];
    }
    if (dir == 0) {
      // up
      nextState._moveUp();
    } else if (dir == 1) {
      // right
      nextState._rotate(3);
      nextState._moveUp();
      nextState._rotate(1);
    } else if (dir == 2) {
      // down
      nextState._rotate(2);
      nextState._moveUp();
      nextState._rotate(2);
    } else {
      // left
      nextState._rotate(1);
      nextState._moveUp();
      nextState._rotate(3);
    }
    return nextState;
  }
  // 死んでないか確かめる
  isDie() {
    // 全部埋まっていて, かつどの隣り合ったセル同士も異なっていたら true
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        if (this.board[i*4+j] === 0) {
          return false;
        }
        const dx = [1, 0];
        const dy = [0, 1];
        for (let k = 0; k < 2; ++k) {
          let ni = i + dy[k], nj = j + dx[k];
          if (ni >= 4 || nj >= 4) {
            continue;
          }
          if (this.board[i*4+j] === this.board[ni*4+nj]) {
            return false;
          }
        }
      }
    }
    return true;
  }
  // 空き領域を配列にして返す
  getEmptyCells() {
    for (let i = 0; i < 16; i++) {
      let result = [];
      if (this.board[i] == 0) {
        result.push(i);
      }
      return result;
    }
  }
  // セルの値を書き換える(ランダムに出現するのをイメージ)
  // だけど別の用途で使ってもいいやという
  rewriteCells(index, value) {
    this.board[index] = value;
  }
  // board を時計回りに回転させる
  _rotate(rot) {
    for (let i = 0; i < rot; ++i) {
      let nextBoard = [];
      let nextMerge = [];
      for (let j = 0; j < 16; ++j) {
        let y = Math.floor(j/4), x = j - 4*y;
        let ny = x, nx = 3-y;
        nextBoard[ny*4+nx] = this.board[j];
        nextMerge[ny*4+nx] = this.merge[j];
      }
      this.board = nextCells;
      this.merge = nextMerge;
      let nextMoveCells = [];
      for (let i = 0; i < this.moveCells.length; ++i) {
        const moveCell = this.moveCells[i];
        let fx = moveCell.fx, fy = moveCell.fy, tx = moveCell.tx, ty = moveCell.ty;
        nextMoveCells.push({fx: 3-fy, fy: fx, tx: 3-ty, ty: tx});
      }
      this.moveCells = nextMoveCells;
    }
  }
  // 後 _moveUp が必要ですね
  _moveUp() {
    // merge 情報をリセット
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) {
        this.merge[y*4+x] = false;
      }
    }
    // 上から順番に見ていき, くっつけられるならくっつけていく
    for (let y = 1; y < 4; y++) {
      for (let x = 0; x < 4; ++x) {
        if (this.board[y*4+x] === 0) continue;
        let cy = y;
        while (cy >= 1) {
          const num = this.board[(cy-1)*4+x];
          if (num === 0) {
            // 上が空いてるなら普通に動かす
            this.board[(cy-1)*4+x] = this.board[cy*4+x];
            this.board[cy*4+x] = 0;
            --cy;
          } else if (num === this.board[cy*4+x] && !this.merge[cy*4+x] && !this.merge[(cy-1)*4+x]) {
            // 上と同じ数なら合体させる
            this.board[(cy-1)*4+x] = 2*num;
            this.board[cy*4+x] = 0;
            this.merge[(cy-1)*4+x] = true;
            --cy;
          } else {
            break;
          }
        }
        if (cy != y) {
          // 少なくとも一マス動いているので動き情報を記録
          this.moveCells.push({fx: x, fy: y, tx: x, ty: cy});
        }
      }
    }
  }
}

// Game 全体を管理するクラス
class Game {
  constructor() {
    // 制御するセルを指定
    this.screen = document.getElementById("gameBoard");
    // セルの集合を定義
    this.cells = [];
    for (let i = 0; i < 16; i++) {
      const y = Math.floor(i / 4), x = i % 4;
      const cell = new Cell(y, x);
      cell.changeAttrib(0);
      this.cells.push(cell);
      this.screen.appendChild(cell.elem);
    }
    this.cells[0].changeAttrib(128);
    this.cells[3].changeAttrib(4096);
    this.isOver = false;
  }
  // キー入力に対応してゴニョゴニョする
  move() {
    if (this.isOver) return;
    let result = false;
    if (global.keys[38]) { // up
      result = this._moveUp();
    } else if (global.keys[39]) { // right
      this._rotate(3);
      result = this._moveUp();
      this._rotate(1);
    } else if (global.keys[40]) { // down
      this._rotate(2);
      result = this._moveUp();
      this._rotate(2);
    } else if (global.keys[37]) { // left
      this._rotate(1);
      result = this._moveUp();
      this._rotate(3);
    }
    console.log(result);
    // いずれかのセルが動いたならば
    if (result) {
      // 空いているセルのいずれかにセルを 2 or 4 を追加
      let empty = [];
      for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 4; j++) {
          if (this.cells[i*4+j].num === 0) {
            empty.push(i*4+j);
          }
        }
      }
      const num = (Math.random() < 0.75 ? 2 : 4);
      const index = empty[Math.floor(Math.random() * empty.length)];
      this.cells[index].changeAttrib(num);
    }
    // 死んでないかチェック
    this.isOver = this._check();
  }
}

// アニメーションを管理するクラス
// Cell を管理するクラス
class Cell {
  constructor(y, x) {
    this.elem = this._initElement();
    this.elem.style.left = `${y * (Settings.CELL_HEIGHT + Settings.CELL_MARGIN) + Settings.CELL_MARGIN}px`;
    this.elem.style.top = `${x * (Settings.CELL_WIDTH + Settings.CELL_MARGIN) + Settings.CELL_MARGIN}px`;
    this.num = 0;
    this.merge = false;
  }
  // セルの値を変更する
  changeAttrib(num) {
    this.elem.textContent = (num > 0 ? num : "");
    this.num = num;
    switch (num) {
      case 0:
        this.elem.style.backgroundColor = "#ccc";
        this.elem.style.color = "#000"
        break;
      case 2:
        this.elem.style.backgroundColor = "#eee";
        this.elem.style.color = "#000"
        break;
      case 4:
        this.elem.style.backgroundColor = "#eec";
        this.elem.style.color = "#000"
        break;
      case 8:
        this.elem.style.backgroundColor = "#f93";
        this.elem.style.color = "#fff";
        break;
      case 16:
        this.elem.style.backgroundColor = "#c66";
        this.elem.style.color = "#fff";
        break;
      case 32:
        this.elem.style.backgroundColor = "#c33";
        this.elem.style.color = "#fff";
        break;
      case 64:
        this.elem.style.backgroundColor = "#c11";
        this.elem.style.color = "#fff";
        break;
      case 128:
        this.elem.style.backgroundColor = "#fc6";
        this.elem.style.color = "#fff";
        break;
      case 256:
        this.elem.style.backgroundColor = "#fc5";
        this.elem.style.color = "#fff";
        break;
      case 512:
        this.elem.style.backgroundColor = "#fc3";
        this.elem.style.color = "#fff";
        break;
      case 1024:
        this.elem.style.backgroundColor = "#fc1";
        this.elem.style.color = "#fff";
        break;
      case 2048:
        this.elem.style.backgroundColor = "#fc0";
        this.elem.style.color = "#fff";
        break;
      default:
        this.elem.style.backgroundColor = "#222";
        this.elem.style.color = "#fff";
        break;
    }
  }
  _initElement() {
    const result = document.createElement("div");
    result.classList.add("gameCell");
    result.style.height = `${Settings.CELL_HEIGHT}px`;
    result.style.width = `${Settings.CELL_WIDTH}px`;
    return result;
  }
}

const game = new Game();

// key 入力
document.addEventListener("keydown", (e) => {
  global.keys[e.keyCode] = true;
  console.log(e.keyCode);
  game.move();
});
document.addEventListener("keyup", (e) => {
  global.keys[e.keyCode] = false;
});
