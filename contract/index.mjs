import { loadStdlib } from '@reach-sh/stdlib';
import * as backend from './build/index.main.mjs';
import { ask, yesno, done } from '@reach-sh/stdlib/ask.mjs';
const stdlib = loadStdlib(process.env);

(async () => {
  const isAlice = await ask(
    `你是 Alice 吗?`,
    yesno
  );
  const who = isAlice ? 'Alice' : 'Bob';

  console.log(`你好 ${who} 欢迎来到冰壶游戏!`);

  let acc = null;
  const createAcc = await ask(
    `你是否想要创建一个账户?`,
    yesno
  );
  if (createAcc) {
    acc = await stdlib.newTestAccount(stdlib.parseCurrency(1000));
  } else {
    const secret = await ask(
      `你的账户秘钥是什么?`,
      (x => x)
    );
    acc = await stdlib.newAccountFromSecret(secret);
  }

  let ctc = null;
  if (isAlice) {
    ctc = acc.contract(backend);
    ctc.getInfo().then((info) => {
      console.log(`部署的合约地址为: ${JSON.stringify(info)}`); });
  } else {
    const info = await ask(
      `粘贴合约地址在下面:`,
      JSON.parse
    );
    ctc = acc.contract(backend, info);
  }

  const fmt = (x) => stdlib.formatCurrency(x, 4);
  const getBalance = async () => fmt(await stdlib.balanceOf(acc));

  const before = await getBalance();
  console.log(`你当前的余额为 ${before}`);

  const interact = { ...stdlib.hasRandom };

  interact.informTimeout = () => {
    console.log(`超时。。。`);
    process.exit(1);
  };

  if (isAlice) {
    const amt = await ask(
      `你想押注多少?`,
      stdlib.parseCurrency
    );
    interact.wager = amt;
    interact.deadline = { ETH: 100, ALGO: 100, CFX: 1000 }[stdlib.connector];
  } else {
    interact.acceptWager = async (amt, rd) => {
      const accepted = await ask(
        `赌注: ${fmt(amt)}, ${rd * 2 - 1} 局 ${rd} 胜制, 你是否愿意接受?`,
        yesno
      );
      if (!accepted) {
        process.exit(0);
      }
    };
  }

  interact.getNum = async () => {
    const hand = await ask(`你想输入哪个数字?`, (x) => {
      const hand = x;
      if ( hand < 0 ) {
        throw Error(`我们只接受正数,而不是 ${hand}`);
      }
      return hand;
    });
    console.log(`你输入了 ${hand}`);
    return hand;
  };

  // 根据输入确定几轮胜
  interact.getRound = async () => {
    const round = await ask(`你想几胜定胜负?`, (r) => {
      const round = r;
      if( r < 0 ) {
        throw Error(`我们只接受正整数,而不是 ${round}`);
      }
      console.log(`你输入了 ${round}`);
      return round;
    });
    return round;
  };

  interact.getTarget = async () => {
    const target = Math.floor(Math.random() * 100);
    return target;
  }

  interact.showTarget = async (target) => {
    console.log(`本轮的target是 ${target}`);
  }

  interact.getRandom = async () => Math.floor(Math.random() * 3);

  interact.showNum = async (final) => {
    console.log(`你的最终数字是 ${final}`);
  };

  interact.seeOutcome = async (bool) => {
    if(bool == true) {
      console.log("最终赢家: Alice");
    } else {
      console.log("最终赢家: Bob");
    }
  };

  interact.seeSmallOutcome = async (bool) => {
    if(bool == true) {
      console.log("本轮 Alice win");
    } else {
      console.log("本轮 Bob win");
    }
  };

  const part = isAlice ? ctc.p.Alice : ctc.p.Bob;
  await part(interact);

  const after = await getBalance();
  console.log(`你的当前余额为 ${after}`);

  done();
})(); 
