let global = {
  keys: []
};

let Settings = {
  CELL_WIDTH: 100,
  CELL_HEIGHT: 100,
  CELL_MARGIN: 12,
  ANIMATION_SWELLING: 8,
  ANIMATION_GEN_TIME: 100,
  FONT_SIZE: 40
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
    // move どの向きに移動したのかを求める
    // 0: up
    // 1: right
    // 2: down
    // 3: left
    this.move = -1;
    for (let i = 0; i < 16; i++) {
      this.board.push(0);
      this.merge.push(false);
    }
  }
  // 指示された方向に動いた際の次の State を求める
  calcNextState(dir) {
    let nextState = new State();
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
    // 動いてたら動いてたという情報を与える
    this.move = -1;
    if (this.moveCells.length > 0) {
      this.move = dir;
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
    let result = [];
    for (let i = 0; i < 16; i++) {
      if (this.board[i] == 0) {
        result.push(i);
      }
    }
    return result;
  }
  // セルの値を書き換える(ランダムに出現するのをイメージ)
  // だけど別の用途で使ってもいいやという
  // y, x: 場所
  rewriteCells(y, x, value) {
    this.board[y*4 + x] = value;
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
      this.board = nextBoard;
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
    this.animation = new Animation(this.screen);
    this.state = new State();
    // 初期状態として 2 つ cell を入れておく
    for (let i = 0; i < 2; i++) {
      const empty = this.state.getEmptyCells();
      const num = (Math.random() < 0.75 ? 2 : 4);
      const index = empty[Math.floor(Math.random() * empty.length)];
      const y = Math.floor(index/4), x = index%4;
      this.state.rewriteCells(y, x, num);
      this.animation.generate(this.screen, y, x, num, 1);
    }
  }
  // キー入力に対応してゴニョゴニョする
  move(dir) {
    if (this.state.isDie()) return;
    if (!this.animation.finish) return;
    let nextState = this.state.calcNextState(dir);
    // いずれかのセルが動いたならば
    if (nextState.moveCells.length > 0) {
      // ランダムに数字を挿入する処理
      const empty = nextState.getEmptyCells();
      const num = (Math.random() < 0.75 ? 2 : 4);
      const index = empty[Math.floor(Math.random() * empty.length)];
      const y = Math.floor(index/4), x = index%4;

      // なんやかんや
      nextState.rewriteCells(y, x, num);

      // アニメーション
      this.animation.update(nextState, y, x, num);

      // state を更新
      this.state = nextState;
    }
  }
}

class Animation {
  constructor(screen) {
    // 下に並べて置くセル
    this.bottomCells = [];
    // 実際に動くセル
    this.cells = [];
    // セルの位置を覚えておく
    // this.cells[i] の位置は this.pos[i] が覚えておく
    this.pos = new Map();
    // 新しいセルを出現させるときのイテレーター的な
    this.itr = 0;
    for (let i = 0; i < 16; i++) {
      const y = Math.floor(i / 4), x = i % 4;
      const cell = new Cell(0, screen);
      cell.setPos(y, x);
      this.bottomCells.push(cell);
    }
    this.screen = screen;
    // アニメーションが終了したかどうか
    this.finish = true;
  }
  // 指定したセル群を移動させる -> 合体させる -> 新しい数字が表れる
  // 引数：State クラス
  // 最後に merge したところから数字を登場させる
  update(state, addY, addX, addNum) {
    // アニメーション開始
    this.finish = false;
    // 移動するアニメーション
    {
      let progress = 0;
      const time = Settings.ANIMATION_GEN_TIME;
      let start = null;

      // index -> 目標位置
      let map = new Map();
      for (const move of state.moveCells) {
        let index = -1;
        this.pos.forEach((value, key, map) => {
          if (value.x === move.fx && value.y === move.fy) {
            index = key;
          }
        });
        if (index === -1) {
          console.error("cell not found!");
          continue;
        }
        map.set(index, move);
      }
      map.forEach((value, key, map) => {
        this.pos.set(key, {x: value.tx, y: value.ty});
      });

      const proc = (timestamp) => {
        if (!start) {
          start = timestamp;
        }
        progress = (timestamp - start) / time;
        progress = Math.min(progress, 1);

        if (progress >= 0) {
          map.forEach((value, key, map) => {
            this.cells[key].translate(value.fx, value.fy, value.tx, value.ty, progress);
          });
        }

        if (progress < 1) {
          requestAnimationFrame(proc);
        }
      }
      requestAnimationFrame(proc);
    }
    // 数字が合体して数字が表れるアニメーション
    {
      // removeChild する要素の index
      let deleteIndex = [];
      // 数を倍にする要素の index
      let animationIndex = [];
      // merge が true になる場所に向かっているセルは必ず二つあるので, 一つは delete に入れてもう一つは animation に入れる
      for (let y = 0; y < 4; ++y) {
        for (let x = 0; x < 4; ++x) {
          if (state.merge[y*4+x]) {
            // this.pos から index を二つ探す
            let index = [];
            this.pos.forEach((value, key, map) => {
              if (value.x === x && value.y === y) {
                index.push(key);
              }
            });
            deleteIndex.push(index[0]);
            animationIndex.push(index[1]);
          }
        }
      }
      // 新しく追加する数字
      const addIndex = this.itr++;
      this.pos.set(addIndex, {x: addX, y: addY});

      let progress = 0;
      const time = Settings.ANIMATION_GEN_TIME;
      let start = null;
      
      const proc = () => {
        if (!start) {
          start = new Date();
          this.cells[addIndex] = new Cell(addNum, this.screen);
        }
        let timestamp = new Date();
        progress = (timestamp - start) / time;
        progress = Math.min(progress, 1);

        if (progress >= 0) {
          for (let index of animationIndex) {
            let p = this.pos.get(index);
            this.cells[index].changeAttrib(state.board[p.y*4+p.x]);
            this.cells[index].appear(this.pos.get(index).y, this.pos.get(index).x, progress, 2);
          }
          this.cells[addIndex].appear(addY, addX, progress, 1);
        }

        if (progress < 1) {
          requestAnimationFrame(proc);
        } else {
          // アニメーション終了
          this.finish = true;
          for (let index of deleteIndex) {
            this.screen.removeChild(this.cells[index].elem);
            this.cells[index] = null;
            this.pos.delete(index);
          }
        }
      }
      setTimeout(proc, Settings.ANIMATION_GEN_TIME*1.1);
    }
  }
  // 数字が表れる
  // screen: 親要素
  // [y, x] 座標に num を登場させるアニメーション
  // type: アニメーションの仕方(0: 特に何も 1: 広がる感じ(ランダムに表れるやつ) 2: 広がってから落ち着く(合体するやつ))
  generate(screen, y, x, num, type=0) {
    let index = -1;
    this.pos.forEach((value, key, map) => {
      if (value.x === x && value.y === y) {
        index = key;
      }
    });
    if (index !== -1) {
      this.cells[index].changeAttrib(num);
      return;
    }
    index = this.itr++;
    this.cells[index] = new Cell(num, screen);
    this.pos.set(index, {x: x, y: y});
    let progress = 0;
    let start = null;
    const time = Settings.ANIMATION_GEN_TIME;

    const update = (timestamp) => {
      if (!start) {
        start = timestamp;
      }
      progress = (timestamp - start) / time;
      progress = Math.min(progress, 1);

      if (progress >= 0) {
        this.cells[index].appear(y, x, progress, type);
      }

      if (progress < 1) {
        requestAnimationFrame(update);
      }
    }
    requestAnimationFrame(update);
  }
}

// Cell を管理するクラス
class Cell {
  // num: 数字
  // screen: 親要素
  constructor(num, screen) {
    this.elem = this._initElement();
    screen.appendChild(this.elem);
    this.changeAttrib(num);
  }
  // 移動する
  // fx, fy: どこから
  // tx, ty: どこへ
  // process: 進捗率
  translate(fx, fy, tx, ty, process) {
    const x = fx + (tx - fx) * process;
    const y = fy + (ty - fy) * process;
    const posX = x * (Settings.CELL_WIDTH + Settings.CELL_MARGIN) + Settings.CELL_MARGIN;
    const posY = y * (Settings.CELL_HEIGHT + Settings.CELL_MARGIN) + Settings.CELL_MARGIN;
    this.elem.style.left = `${posX}px`;
    this.elem.style.top = `${posY}px`;
  }
  // セルを配置
  // y, x: 配置する位置
  setPos(y, x) {
    this.appear(y, x, 0);
  }
  // 新しいセルが現れるアニメーション
  // y, x: 出てくる位置
  // process: 進捗率
  // type: アニメーションの仕方(0: 特に何も 1: 広がる感じ(ランダムに表れるやつ) 2: 広がってから落ち着く(合体するやつ))
  appear(y, x, progress, type=0) {
    let height = Settings.CELL_HEIGHT;
    let width = Settings.CELL_WIDTH;
    let posY = y * (Settings.CELL_HEIGHT + Settings.CELL_MARGIN) + Settings.CELL_MARGIN;
    let posX = x * (Settings.CELL_WIDTH + Settings.CELL_MARGIN) + Settings.CELL_MARGIN;
    let fontSize = Settings.FONT_SIZE;
    if (type === 1) {
      height = Settings.CELL_HEIGHT * progress;
      width = Settings.CELL_WIDTH * progress;
      posX = x * (Settings.CELL_WIDTH + Settings.CELL_MARGIN) + Settings.CELL_MARGIN + (Settings.CELL_WIDTH - width) / 2;
      posY = y * (Settings.CELL_HEIGHT + Settings.CELL_MARGIN) + Settings.CELL_MARGIN + (Settings.CELL_HEIGHT - height) / 2;
      fontSize = Settings.FONT_SIZE * progress;
    } else if (type === 2) {
      height = Settings.CELL_HEIGHT + Settings.ANIMATION_SWELLING * Math.sin(Math.PI * progress);
      width = Settings.CELL_WIDTH + Settings.ANIMATION_SWELLING * Math.sin(Math.PI * progress);
      posX = x * (Settings.CELL_WIDTH + Settings.CELL_MARGIN) + Settings.CELL_MARGIN + (Settings.CELL_WIDTH - width) / 2;
      posY = y * (Settings.CELL_HEIGHT + Settings.CELL_MARGIN) + Settings.CELL_MARGIN + (Settings.CELL_HEIGHT - height) / 2;
      fontSize = Settings.FONT_SIZE * (height / Settings.CELL_HEIGHT);
    }
    this.elem.style.left = `${posX}px`;
    this.elem.style.top = `${posY}px`;
    this.elem.style.height = `${height}px`;
    this.elem.style.width = `${width}px`;
    this.elem.style.fontSize = `${fontSize}px`;
    this.elem.style.lineHeight = `${height}px`;
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

// state 情報を読み込んで次の動きを考えてくれる AI クラス
class GameAI {
  constructor() {
    this.weight = [];
    for (let i = 0; i < 4; i++) {
      this.weight[i] = 2**(7-i);
    }
    for (let i = 4; i < 8; i++) {
      this.weight[i] = 2**(i-4);
    }
    for (let i = 8; i < 12; i++) {
      this.weight[i] = -(2**(i-8));
    }
    for (let i = 12; i < 16; i++) {
      this.weight[i] = -(2**(19-i));
    }
  }
  evaluate(state) {
    let result = 0;
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) {
        const dy = [0, 1, 0, -1];
        const dx = [1, 0, -1, 0];
        for (let k = 0; k < 4; k++) {
          const ny = y+dy[k], nx = x+dx[k];
          if (ny < 0 || ny >= 4 || nx < 0 || nx >= 4) continue;
          result += Math.abs(state.board[y*4+x] - state.board[ny*4+nx]);
        }
      }
    }
    return -result;
    for (let i = 0; i < 4; i++) {
      let tmp = 0;
      for (let j = 0; j < 16; j++) {
        tmp += this.weight[j] * state.board[j];
      }
      result = Math.max(result, tmp);
      this._rotate();
    }
    return result;
  }
  nextMove(state) {
    let maxDepth = 2;
    if (state.getEmptyCells().length < 6) {
      maxDepth = 3;
    }
    return this._dfs(state, 0, maxDepth)[1];
  }
  _dfs(state, depth, maxDepth) {
    if (depth == maxDepth) {
      return [this.evaluate(state), -1];
    }
    let ans = [-(2**30), 0];
    for (let dir = 0; dir < 4; dir++) {
      let nextState = state.calcNextState(dir);
      if (nextState.moveCells.length > 0) {
        let tmp = 0;
        let emptyCells = nextState.getEmptyCells();
        for (let index of emptyCells) {
          const y = Math.floor(index/4), x = index % 4;
          nextState.rewriteCells(y, x, 2);
          tmp += 0.75 * this._dfs(nextState, depth+1, maxDepth)[0];
          nextState.rewriteCells(y, x, 4);
          tmp += 0.25 * this._dfs(nextState, depth+1, maxDepth)[0];
        }
        tmp /= emptyCells.length;
        if (ans[0] < tmp) {
          ans[0] = tmp;
          ans[1] = dir;
        }
      }
    }
    return ans;
  }
  _rotate() {
    let result = [];
    for (let i = 0; i < 16; i++) {
      result[i] = this.weight[i];
    }
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) {
        const ny = x, nx = 3-y;
        result[ny*4+nx] = this.weight[y*4+x];
      }
    }
    this.weight = result;
  }
}

const game = new Game();

// key 入力
document.addEventListener("keydown", (e) => {
  global.keys[e.keyCode] = true;
  if (global.keys[38]) { // up
    game.move(0);
  } else if (global.keys[39]) { // right
    game.move(1);
  } else if (global.keys[40]) { // down
    game.move(2);
  } else if (global.keys[37]) { // left
    game.move(3);
  } else {
    return;
  }
});
document.addEventListener("keyup", (e) => {
  global.keys[e.keyCode] = false;
});

const elem = document.getElementById("autoButton");
elem.addEventListener("click", (e) => {
  if (elem.textContent === "AUTO") {
    elem.textContent = "STOP";
    const ai = new GameAI();
    const dir = ai.nextMove(game.state);
    const update = () => {
      game.move(ai.nextMove(game.state));
      if (elem.textContent === "STOP") requestAnimationFrame(update);
    };
    requestAnimationFrame(update);
  } else {
    elem.textContent = "AUTO";
  }
});