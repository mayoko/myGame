let global = {
  keys: []
};

// Game 全体を管理するクラス
class Game {
  constructor() {
    // 制御するセルを指定
    this.screen = document.getElementById("gameBoard");
    // セルの集合を定義
    this.cells = [];
    for (let i = 0; i < 16; i++) {
      const cell = new Cell();
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
  isOver() {
    return this.isOver;
  }
  // ゲームオーバーでないか確かめる
  // ゲームオーバーなら true, そうでないなら false
  _check() {
    // 全部埋まっていて, かつどの隣り合ったセル同士も異なっていたら true
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        if (this.cells[i*4+j].num === 0) {
          return false;
        }
        const dx = [1, 0];
        const dy = [0, 1];
        for (let k = 0; k < 2; ++k) {
          let ni = i + dy[k], nj = j + dx[k];
          if (ni >= 4 || nj >= 4) {
            continue;
          }
          if (this.cells[i*4+j].num === this.cells[ni*4+nj].num) {
            return false;
          }
        }
      }
    }
    return true;
  }
  // board を時計回りに回転させる
  _rotate(rot) {
    for (let i = 0; i < rot; ++i) {
      let nextCells = [];
      for (let j = 0; j < 16; ++j) {
        let y = Math.floor(j/4), x = j - 4*y;
        let ny = x, nx = 3-y;
        nextCells[ny*4+nx] = this.cells[j];
      }
      this.cells = nextCells;
    }
  }
  // board の上側にセルを動かす
  // 少なくとも一つのセルが動いたなら true, そうでないなら false
  _moveUp() {
    let result = false;
    // merge 情報をリセット
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) {
        this.cells[y*4+x].merge = false;
      }
    }
    // 上から順番に見ていき, くっつけられるならくっつけていく
    for (let y = 1; y < 4; y++) {
      for (let x = 0; x < 4; ++x) {
        if (this.cells[y*4+x].num === 0) continue;
        let cy = y;
        while (cy >= 1) {
          const num = this.cells[(cy-1)*4+x].num;
          if (num === 0) {
            // 上が空いてるなら普通に動かす
            result = true;
            this.cells[(cy-1)*4+x].changeAttrib(this.cells[cy*4+x].num);
            this.cells[cy*4+x].changeAttrib(0);
            --cy;
          } else if (num === this.cells[cy*4+x].num && !this.cells[cy*4+x].merge && !this.cells[(cy-1)*4+x].merge) {
            // 上と同じ数なら合体させる
            result = true;
            this.cells[(cy-1)*4+x].changeAttrib(2*num);
            this.cells[cy*4+x].changeAttrib(0);
            this.cells[(cy-1)*4+x].merge = true;
            --cy;
          } else {
            break;
          }
        }
      }
    }
    return result;
  }
}

// Cell を管理するクラス
class Cell {
  constructor() {
    this.elem = this._initElement();
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
