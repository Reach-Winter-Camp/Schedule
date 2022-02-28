import React from 'react';
import AppViews from './views/AppViews';
import DeployerViews from './views/DeployerViews';
import AttacherViews from './views/AttacherViews';
import {renderDOM, renderView} from './views/render';
import './index.css';
import * as backend from './build/index.main.mjs';
import {loadStdlib} from '@reach-sh/stdlib';
const reach = loadStdlib(process.env);

const handToInt = {'ROCK': 0, 'PAPER': 1, 'SCISSORS': 2};
const intToOutcome = ['Bob wins!', 'Draw!', 'Alice wins!'];
const {standardUnit} = reach;
const defaults = {defaultFundAmt: '10', defaultWager: '3', standardUnit};

class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {view: 'ConnectAccount', ...defaults}; //初始化组件状态以显示 ConnectAccount 对话框
  }
  async componentDidMount() { //第 21 行到第 31 行，我们连接到 React 的 componentDidMount 生命周期事件，该事件在组件启动时被调用
    const acc = await reach.getDefaultAccount(); //第 22 行，我们使用 getDefaultAccount ，它会连接默认的浏览器钱包。例如，当与以太坊一起使用时，它会连接当前的 MetaMask 帐户
    const balAtomic = await reach.balanceOf(acc); 
    const bal = reach.formatCurrency(balAtomic, 4);//货币值被格式化的表达式，使用系统控制面板中定义的货币符号
    this.setState({acc, bal});
    if (await reach.canFundFromFaucet()) { //在第 26 行中，我们使用 canFundFromFaucet 尝试访问 Reach 开发人员测试网络水龙头
      this.setState({view: 'FundAccount'}); //在第 27 行，如果 canFundFromFaucet 为 true，我们设置组件状态，显示 FundAccount 对话框
    } else {
      this.setState({view: 'DeployerOrAttacher'}); //在第 29 行，如果 canFundFromFaucet 为 false，我们设置组件状态，跳到 Choose Role 对话框
    }
  }
  async fundAccount(fundAmount) { //在第 32 行到第 35 行，我们定义了当用户点击 Fund Account 时要做什么
    await reach.fundFromFaucet(this.state.acc, reach.parseCurrency(fundAmount)); //在第 33 行，我们将资金从水龙头转到用户的帐户
    this.setState({view: 'DeployerOrAttacher'}); //在第 34 行，我们设置组件状态以显示 Choose Role 对话框
  }
  async skipFundAccount() { this.setState({view: 'DeployerOrAttacher'}); } //在第 36 行，我们定义了当用户单击 Skip 按钮时要做的事情，即设置组件状态以显示 Choose Role 对话框
  selectAttacher() { this.setState({view: 'Wrapper', ContentView: Attacher}); } 
  selectDeployer() { this.setState({view: 'Wrapper', ContentView: Deployer}); }
  selectRound() { this.setState({view: 'Wrapper', ContentView: GetRound}); }
  render() { return renderView(this, AppViews); } //在第 39 行，我们从 rps-9-web/views/AppViews.js 中渲染对应的视图
}

class Player extends React.Component {
  random() { return reach.hasRandom.random(); } //在第 43 行，我们提供 random 回调函数
  async getHand() { // Fun([], UInt) //在第 44 至 50 行，我们提供 `getHand``` 回调函数（改）
    const hand = await new Promise(resolveHandP => { //在第 45 行到第 47 行，我们设置组件状态，显示 Get Hand 对话框（2.9.6），并等待用户交互 resolve 这个 Promise
      this.setState({view: 'GetHand', playable: true, resolveHandP});
    });
    this.setState({view: 'WaitingForResults', hand}); //在 Promise 被 resolve 之后的第 48 行中，我们设置组件状态，显示 Waiting For Results 对话框
    return handToInt[hand];
  }
  seeOutcome(i) { this.setState({view: 'Done', outcome: intToOutcome[i]}); } //在第 51 行和第 52 行中，我们提供了seeOutcome 和 informTimeout 回调，它们设置组件状态来分别显示 Done 视图（2.9.8）和 Timeout 视图（2.9.9）
  informTimeout() { this.setState({view: 'Timeout'}); }
  playHand(hand) { this.state.resolveHandP(hand); } //在第 53 行，我们定义了当用户点击石头、剪刀、布时会发生什么：resolve 第 45 行的 Promise
}
class GetRound extends Player{
  constructor(props){
    super(props);
    this.state = {view :'SetWager'};
  }
  setWager(wager) { this.setState({view: 'Deploy', wager}); }
  async setround(round){
    const ctc = this.props.acc.contract(backend, JSON.parse(round));
    this.setState({view:'Deploy',ctc});
    backend.Alice(ctc, this);
    const ctcInfoStr = JSON.stringify(await ctc.getInfo(), null, 2);
    this.setState({view: 'WaitingForAttacher', ctcInfoStr});
  }
  render() { return renderView(this, DeployerViews); }
}
class Deployer extends Player {
  constructor(props) {
    super(props);
    this.state = {view: 'SetRound'}; //第 59 行，我们设置组件状态，显示 Set Wager 对话框
  }
  SetRound(round){this.setState({view:'Round',round});} //在第 61 行，我们定义了当用户单击 Set Wager 按钮时要做的事情，即设置组件状态以显示 Deploy 对话框
  async deploy() { //在第 62 至 69 行中，我们定义了当用户单击 Deploy 按钮时要做什么
    const ctc = this.props.acc.contract(backend); //在第 63 行中，我们调用 acc.deploy 部署合约
    this.setState({view: 'Deploying', ctc}); //在第 64 行，我们设置组件状态，显示 Deploying 对话框
    this.wager = reach.parseCurrency(this.state.wager); // UInt //在第 65 行，我们设置了赌注属性 wager
    this.deadline = {ETH: 10, ALGO: 100, CFX: 1000}[reach.connector]; // UInt //在第 66 行，我们根据连接的网络设置时限属性 deadline
    backend.Alice(ctc, this); //在第 67 行，我们开始作为 Alice 运行 Reach 程序，使用 React 组件 this 作为参与者交互接口对象
    const ctcInfoStr = JSON.stringify(await ctc.getInfo(), null, 2); //在第 68 - 69 行，我们设置组件状态，显示 Waiting For Attacher 对话框（2.9.14），它将部署的合约信息显示为 JSON
    this.setState({view: 'WaitingForAttacher', ctcInfoStr});
  }
  render() { return renderView(this, DeployerViews); } //在第 71 行中，我们从 rps-9-web/views/DeployerViews.js 中呈现对应的视图
}
class Attacher extends Player {
  constructor(props) {
    super(props);
    this.state = {view: 'Attach'}; //在第 76 行，我们初始化组件状态，显示 Attach 对话框
  }
  attach(ctcInfoStr) { //在第 78 至 82 行，我们定义了当用户点击 Attach 按钮时会发生什么
    const ctc = this.props.acc.contract(backend, JSON.parse(ctcInfoStr)); //在第 79 行，我们调用 acc.attach
    this.setState({view: 'Attaching'}); //在第 80 行，我们设置组件状态，显示Attachign 视图
    backend.Bob(ctc, this); //在第 81 行，我们开始以 Bob 的身份运行 Reach 程序，使用 React 组件 this 作为参与者交互接口对象
  }
  async acceptWager(wagerAtomic) { // Fun([UInt], Null) //在第 83 行到第 88 行，我们定义了 acceptWager 回调函数
    const wager = reach.formatCurrency(wagerAtomic, 4);
    return await new Promise(resolveAcceptedP => { //在第 85 行到第 87 行，我们将组件状态设置为显示 Accept Terms 对话框（2.9.18），并等待用户交互 resolve 这个 Promise 
      this.setState({view: 'AcceptTerms', wager, resolveAcceptedP});
    });
  }
  termsAccepted() { //在第 89 行到第 92 行，我们定义了当用户点击 Accept Terms and Pay Wager 按钮时发生的事情：resolve 第 90 行的 Promise ，设置组件状态以显示 Waiting For Turn 对话框
    this.state.resolveAcceptedP();
    this.setState({view: 'WaitingForTurn'});
  }
  render() { return renderView(this, AttacherViews); } //在第 93 行，我们从 rps-9-web/views/AttacherViews.js 中呈现对应的视图
}

renderDOM(<App />);
