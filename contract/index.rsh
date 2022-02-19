'reach 0.1';

const Player = {
  ...hasRandom,
  getNum: Fun([], UInt),
  seeOutcome: Fun([UInt], Null),
  informTimeout: Fun([], Null),
  getRandom: Fun([], UInt),
  showNum: Fun([UInt], Null),
};

export const main = Reach.App(() => {
  const Alice = Participant('Alice', {
    ...Player,
    wager: UInt, // atomic units of currency
    deadline: UInt, // time delta (blocks/rounds)
  });
  const Bob   = Participant('Bob', {
    ...Player,
    acceptWager: Fun([UInt], Null),
  });
  init();

  const informTimeout = () => {
    each([Alice, Bob], () => {
      interact.informTimeout();
    });
  };

  Alice.only(() => {
    const wager = declassify(interact.wager);
    const deadline = declassify(interact.deadline);
  });
  Alice.publish(wager, deadline)
    .pay(wager);
  commit();

  Bob.only(() => {
    interact.acceptWager(wager);
  });
  Bob.pay(wager)
    .timeout(relativeTime(deadline), () => closeTo(Alice, informTimeout));
  commit();

  // 准备阶段完成
  Alice.only(() => {
    const numAlice = declassify(interact.getNum());
  });
  Alice.publish(numAlice)
    .timeout(relativeTime(deadline), () => closeTo(Bob, informTimeout));
  commit();

  Bob.only(() => {
    const numBob = declassify(interact.getNum());
  });
  Bob.publish(numBob)
    .timeout(relativeTime(deadline), () => closeTo(Alice, informTimeout));
  commit();

  // 计算最终数字
  Alice.only(() => {
    const randAlice = declassify(interact.getRandom());
    const finalAlice = numAlice + randAlice;
    interact.showNum(finalAlice);
  });
  Alice.publish(finalAlice)
    .timeout(relativeTime(deadline), () => closeTo(Bob, informTimeout));
  commit();

  Bob.only(() => {
    const randBob = declassify(interact.getRandom());
    const finalBob = numBob + randBob;
    interact.showNum(finalBob);
  });
  Bob.publish(finalBob)
    .timeout(relativeTime(deadline), () => closeTo(Alice, informTimeout));

  // 情况分类比较
  // 只有一位大于10
  if(finalAlice > 10 && finalBob <= 10) {
    transfer(wager * 2).to(Bob);
    each([Alice, Bob], () => {
        interact.seeOutcome(2);
    });
  }else if(finalAlice <= 10 && finalBob > 10) {
    transfer(wager * 2).to(Alice);
    each([Alice, Bob], () => {
        interact.seeOutcome(0);    
    });
  }
  // 都小于10，比谁的近
  else if(finalAlice <= 10 && finalBob <= 10) {
    const distanceAlice = 10 - finalAlice;
    const distanceBob = 10 - finalBob;
    
    if(distanceAlice < distanceBob) {
        transfer(wager * 2).to(Alice);
        each([Alice, Bob], () => {
            interact.seeOutcome(0);
        });
    }else if(distanceAlice > distanceBob) {
        transfer(wager * 2).to(Bob);
        each([Alice, Bob], () => {
            interact.seeOutcome(2);
        });
    }else {
        transfer(wager).to(Alice);
        transfer(wager).to(Bob);
        each([Alice, Bob], () => {
            interact.seeOutcome(1);
        });
    }
  }
  // 都大于10，平局
  else {
    transfer(wager).to(Alice);
    transfer(wager).to(Bob);
    each([Alice, Bob], () => {
        interact.seeOutcome(1);    
    });  
  }
  commit();
  
}); 
