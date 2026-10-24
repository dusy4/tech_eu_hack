import type {ReactNode} from 'react';
import {AbsoluteFill,Audio,Sequence,staticFile} from 'remotion';
import {TextReveal} from './components/snap-cn/text-reveal';
import {TextBuild} from './components/snap-cn/text-build';
import {BlockWordmark} from './components/snap-cn/block-wordmark';
import {ScreenRecording,type CameraMove} from './components/snap-cn/screen-recording';
import {TerminalSimulator} from './components/snap-cn/terminal-simulator';
import {SnapCnUIProvider} from './lib/snap-cn-ui';

const paper='#f4f6f8';
const ink='#111820';
const blue='#2d72d2';
const theme={background:paper,foreground:ink,primary:blue,accent:blue,fontFamily:'Inter'};
const box=(top:number,height:number):React.CSSProperties=>({position:'absolute',top,left:0,width:'100%',height,display:'flex',alignItems:'center',justifyContent:'center'});
function Line({text,top=30,size=30,color=ink}:{text:string;top?:number;size?:number;color?:string}) {
 return <div style={box(top,60)}><TextBuild text={text} fontSize={size} color={color} firstDuration={8} pushDuration={5} gap={size*.25}/></div>;
}
function Frame({children,label,note}:{children:ReactNode;label:string;note:string}){
 return <AbsoluteFill style={{background:paper}}>
  <Line text={label}/>
  <div style={{position:'absolute',left:40,right:40,top:110,height:540,overflow:'hidden',borderRadius:12,border:'1px solid #d9dee2',background:'white'}}>{children}</div>
  <Line text={note} top={658} size={18} color="#536170"/>
 </AbsoluteFill>;
}
function Shot({file,trim=0,camera=[]}:{file:string;trim?:number;camera?:CameraMove[]}){
 return <ScreenRecording src={staticFile(`captures/${file}`)} sourceAspect={16/9} entrance="none" trimBefore={trim} camera={camera} backdropColor={paper}/>;
}
export function SpelunkDemo(){
 return <SnapCnUIProvider theme={theme}><AbsoluteFill style={{background:paper}}>
  <Audio src={staticFile('audio/elevenlabs-score.wav')} volume={1}/>
  <Sequence durationInFrames={90}>
   <TextReveal text="Great discussions. Lost decisions." fontSize={54} initialScale={1.35} color={ink} wordStagger={5}/>
  </Sequence>
  <Sequence from={90} durationInFrames={150}>
   <BlockWordmark text="Spelunk" fontSize={108} fontFamily="Inter" colors={[blue,'#d6e6fc','#a2c6f5']} color={ink}/>
   <Sequence from={75}><Line text="Talk about code. Keep the decisions." top={500} size={29}/></Sequence>
  </Sequence>
  <Sequence from={240} durationInFrames={150}>
   <Frame label="The conversation, grounded in your code." note="Spelunk prototype · React sample repository">
    <Shot file="overview.png" camera={[{at:0,zoom:1},{at:35,duration:70,zoom:1.08,x:.52,y:.5}]}/>
   </Frame>
  </Sequence>
  <Sequence from={390} durationInFrames={390}>
   <Frame label="Say a function. See where it lives." note="Scripted conversation replay · proposals matched to code symbols">
    <Shot file="conversation.mp4" camera={[{at:0,zoom:1},{at:55,duration:32,zoom:1.28,x:.28,y:.42},{at:220,duration:35,zoom:1.12,x:.78,y:.46},{at:330,duration:30,zoom:1}]}/>
   </Frame>
  </Sequence>
  <Sequence from={780} durationInFrames={240}>
   <Frame label="Your team chooses what moves forward." note="Accept proposals · decisions collect in “Ready for the agent”">
    <Shot file="accept.mp4" camera={[{at:0,zoom:1.15,x:.8,y:.5},{at:45,duration:30,zoom:1.3,x:.83,y:.64},{at:170,duration:35,zoom:1}]}/>
   </Frame>
  </Sequence>
  <Sequence from={1020} durationInFrames={90}>
   <TextReveal text="What breaks if we change this?" fontSize={52} initialScale={1.25} color={ink}/>
  </Sequence>
  <Sequence from={1110} durationInFrames={330}>
   <Frame label="Trace the impact before you refactor." note="Recorded blast radius · callers, dependencies and tests">
    <Shot file="blast.mp4" camera={[{at:0,zoom:1},{at:130,duration:45,zoom:1.16,x:.52,y:.52},{at:270,duration:30,zoom:1}]}/>
   </Frame>
  </Sequence>
  <Sequence from={1440} durationInFrames={240}>
   <AbsoluteFill style={{background:'#101820'}}>
    <div style={{position:'absolute',inset:0,transform:'translateX(-220px)'}}><TerminalSimulator mode="dark" intro={null} command={null} fontSize={11} zoom={{enabled:true,scale:1}} charsPerFrame={1.4} chunkSize={3} theme={{background:'#101820',primary:blue}} lines={[
     {type:'log',text:'Accepted decisions → handoff',pause:12},
     {type:'log',text:'repo: facebook/react',pause:5},
     {type:'success',text:'Show scheduleUpdateOnFiber',pause:8},
     {type:'success',text:'Speaker + reasoning + code reference',pause:8},
     {type:'log',text:'Prepared locally. Transport: prototype.',pause:15}
    ]}/></div>
    <Line text="A handoff with the context intact." top={24} size={32} color="#ffffff"/>
    <Line text="Illustrative payload · external agent delivery requires an endpoint" top={650} size={18} color="#c1c9d1"/>
   </AbsoluteFill>
  </Sequence>
  <Sequence from={1680} durationInFrames={180}>
   <BlockWordmark text="Spelunk" fontSize={108} fontFamily="Inter" colors={[blue,'#d6e6fc','#a2c6f5']} color={ink}/>
   <Sequence from={72}><Line text="From team conversation to the next code change." top={494} size={28}/></Sequence>
   <Sequence from={110}><Line text="Hackathon prototype · built for the room" top={570} size={18} color="#536170"/></Sequence>
  </Sequence>
 </AbsoluteFill></SnapCnUIProvider>;
}
