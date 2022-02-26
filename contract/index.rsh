'reach 0.1';

const Player = {
  ...hasRandom,
  getNum: Fun([], UInt),
  seeOutcome: Fun([Bool], Null),
  informTimeout: Fun([], Null),
  getRandom: Fun([], UInt),
  showNum: Fun([UInt], Null),
  seeSmallOutcome: Fun([Bool], Null),
  showTarget: Fun([UInt], Null),
};

export const main = Reach.App(() => {
  const Alice = Participant('Alice', {
    ...Player,
    wager: UInt, // atomic units of currency
    deadline: UInt, // time delta (blocks/rounds)
    getTarget: Fun([], UInt),
    // Alice确定几轮获胜
    getRound: Fun([], UInt),
  });
  const Bob   = Participant('Bob', {
    ...Player,
    acceptWager: Fun([UInt, UInt], Null),
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
    const round = declassify(interact.getRound());
  });
  Alice.publish(wager, deadline, round)
    .pay(wager);
  commit();

  Bob.only(() => {
    interact.acceptWager(wager, round);
  });
  Bob.pay(wager)
    .timeout(relativeTime(deadline), () => closeTo(Alice, informTimeout));

  // 准备阶段完成
  var [pointAlice, pointBob] = [0, 0];
  invariant(balance() == 2 * wager);
  while (pointAlice < round && pointBob < round) {
    commit();
    Alice.only(() => {
      const numAlice = declassify(interact.getNum());
    });
    Alice.publish(numAlice);
    commit();

    Bob.only(() => {
      const numBob = declassify(interact.getNum());
    });
    Bob.publish(numBob);
    commit();

    Alice.only(() => {
      const target = declassify(interact.getTarget());
    });
    Alice.publish(target);

    const tempA = int(Pos, numAlice);
    const tempB = int(Pos, numBob);
    const tempTarget = int(Pos, target);

    const DistanceA = abs(isub(tempA, tempTarget));
    const DistanceB = abs(isub(tempB, tempTarget));

    each([Alice, Bob], () => {
      interact.showTarget(target);
      interact.seeSmallOutcome(DistanceA <= DistanceB);
    });

    [pointAlice, pointBob] = DistanceA <= DistanceB ? [pointAlice + 1, pointBob] : [pointAlice, pointBob + 1];
    continue;
  }
  const AliceWin = pointAlice > pointBob;

  transfer(wager * 2).to(AliceWin ? Alice : Bob);
  commit();

  each([Alice, Bob], () => {
    interact.seeOutcome(AliceWin);
  });
}); 
