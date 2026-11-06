export type TrainingShot = { id: number; slot: number; lane: number; ticks: number; duration: number };
export type TrainingState = { step: number; lane: number; clock: number; paused: boolean; done: boolean; visited: number; bots: number; health: number; enemyHp: number; lockedLane: number; dodged: boolean; shots: TrainingShot[]; sequence: number; damageSequence: number; notice: string };
export type TrainingAction = { type: 'TICK' | 'NEXT' | 'PAUSE' | 'RESTART' } | { type: 'MOVE'; lane: number };
export const TRAINING_LESSONS = [
  { title: '左右换道', copy: '按住场景左右拖动，机甲会切换轨道。也可以使用方向键或下方按钮。', goal: '依次到达左、右两条轨道。', explain: '换道决定射击方向，也是躲避攻击的主要方式。临近命中时成功换道可触发完美闪避，获得机型专属反击。' },
  { title: '对线自动攻击', copy: '机甲会自动攻击所在轨道的目标。切到无人机所在的右轨道，观察炮弹命中。', goal: '击毁右轨道的训练无人机。', explain: '跨轨道无法命中。力量型射得慢但更重，近战型需等目标进入范围。' },
  { title: '穿过奖励门', copy: '青色门是奖励，站在门所在的轨道，等门的地面线穿过小队才会领取。', goal: '切到左轨道，穿过机甲 +2 门。', explain: '每局从1台机甲开始，局内通过奖励门招募伙伴；伙伴越多，攻击数量越多。正式关卡还会出现电弧、燃烧、回能模块门，穿门获得，同类可叠加至3级。获得两类模块后，后续奖励门可能变成融合门。' },
  { title: '躲开危险', copy: '红色轨道正在预警。趁障碍接近前换到其他轨道，避免扣除核心生命。', goal: '避开当前红色危险轨道。', explain: '正式作战中，核心生命或小队数量归零会战败。训练有保护，可以反复练习。' },
  { title: '躲避后反击首领', copy: '首领先锁定轨道、再发射炮弹。先躲开橙色预警，炮弹结束后回到中轨反击。', goal: '成功躲避一次，再击破首领核心。', explain: '预警后不会继续追踪你。恢复窗口是输出机会；后续首领还有连射、横扫和逐列打击。' },
  { title: '整备完成', copy: '你已经掌握基础操作。正式关卡需要击败首领并完成结算，才能解锁下一关。', goal: '完成训练，准备正式出击。', explain: '正式作战会回收零件，可在机库升级武器、装甲和动力核心。训练不消耗或发放零件。正式战斗中击破和成功闪避会为核心充能；满槽后点击金色爆发按钮，或聚焦战场按空格，释放5秒机型专属技能并清除干扰：脉冲机贯穿敌群、力量机范围爆破、近战机延长剑距并横斩多目标。' },
];
export const createTrainingState = (): TrainingState => ({ step:0,lane:1,clock:0,paused:false,done:false,visited:0,bots:1,health:100,enemyHp:6,lockedLane:1,dodged:false,shots:[],sequence:0,damageSequence:0,notice:'' });
export const trainingGateY = (s: TrainingState) => Math.min(70,26+s.clock*1.2);
export const trainingBossPhase = (s: TrainingState) => s.clock%60<18 ? 'warning' : s.clock%60<30 ? 'flight' : 'recovery';
export function trainingReducer(state: TrainingState, action: TrainingAction): TrainingState {
  if(action.type==='RESTART')return createTrainingState();
  if(action.type==='PAUSE')return {...state,paused:!state.paused};
  if(state.paused)return state;
  if(action.type==='MOVE'){
    const lane=Math.max(0,Math.min(2,Math.round(action.lane)));if(!Number.isFinite(lane))return state;
    const visited=state.step===0?state.visited|(lane===0?1:lane===2?2:0):state.visited;
    return {...state,lane,visited,done:state.done||(state.step===0&&visited===3)};
  }
  if(action.type==='NEXT'){
    if(!state.done||state.step>=5)return state;
    return {...state,step:state.step+1,clock:0,done:false,shots:[],enemyHp:6,lockedLane:state.lane,dodged:false,notice:''};
  }
  if(state.done||state.step===5)return state;
  const s={...state,clock:state.clock+1,shots:state.shots.map(p=>({...p})),notice:state.notice};
  const enemyLane=s.step===1?2:1;
  s.shots=s.shots.filter(p=>{
    if(--p.ticks>0)return true;
    if(p.lane===enemyLane)s.enemyHp=Math.max(0,s.enemyHp-2);
    return false;
  });
  if(s.step===1&&s.enemyHp===0){s.done=true;s.notice='命中有效！无人机已击毁。';}
  if(s.step===2&&trainingGateY(s)>=66){
    if(s.lane===0){s.bots=3;s.done=true;s.notice='奖励已领取，小队增加到3台。';}
    else{s.clock=0;s.notice='门需要从所在轨道穿过。换到左轨道再试一次。';}
  }
  if(s.step===3&&trainingGateY(s)>=66){
    if(s.lane!==s.lockedLane){s.done=true;s.notice='躲避成功，核心生命得以保留。';}
    else{s.clock=0;s.health=Math.max(1,s.health-15);s.damageSequence++;s.notice='受击会扣生命。离开红色轨道，再试一次。';}
  }
  if(s.step===4){
    if(s.clock%60===0)s.lockedLane=s.lane;
    if(s.clock%60===30){
      if(s.lane===s.lockedLane){s.health=Math.max(1,s.health-20);s.damageSequence++;s.notice='炮弹命中了。下一次预警时换道躲开。';}
      else{s.dodged=true;s.notice='躲避成功！现在回到中轨，抓住恢复窗口。';}
    }
    if(s.dodged&&s.enemyHp===0){s.done=true;s.notice='首领核心已击破，基础训练完成！';}
  }
  const shooting=s.step===1||(s.step===4&&s.dodged&&trainingBossPhase(s)==='recovery');
  if(!s.done&&shooting&&s.enemyHp>0&&s.lane===enemyLane&&s.clock%4===0)for(let slot=0;slot<s.bots;slot++)s.shots.push({id:++s.sequence,slot,lane:s.lane,ticks:6,duration:6});
  if(s.done)s.shots=[];
  return s;
}
// Checkpoints resume at a safe lesson entrance, not midway through a projectile.
const TRAINING_SAVE_KEY='toybot-breakout:training:v1';
export const restoreTrainingCheckpoint=(value:unknown):TrainingState=>{
 const base=createTrainingState();const p=value&&typeof value==='object'?value as {version?:number;step?:number}:{};
 if(p.version!==1||typeof p.step!=='number'||!Number.isInteger(p.step)||p.step<0||p.step>5)return base;
 const step=p.step,lane=[1,1,2,0,2,1][step];return {...base,step,lane,lockedLane:lane,bots:step>=3?3:1,notice:step>0?'已恢复到本项练习起点，训练生命已补满。':''};
};
export const readTrainingCheckpoint=():TrainingState=>{try{return restoreTrainingCheckpoint(JSON.parse(window.localStorage.getItem(TRAINING_SAVE_KEY)||'null'));}catch{return createTrainingState();}};
export const saveTrainingCheckpoint=(s:Pick<TrainingState,'step'>)=>{try{window.localStorage.setItem(TRAINING_SAVE_KEY,JSON.stringify({version:1,step:s.step}));}catch{/* A blocked store never interrupts training. */}};
export const clearTrainingCheckpoint=()=>{try{window.localStorage.removeItem(TRAINING_SAVE_KEY);}catch{/* Session-only fallback. */}};
