import {registerRoot,Composition} from 'remotion';
import {SpelunkDemo} from './video';
import {FullDemo} from './full/FullDemo';
import {FPS,TOTAL} from './full/timeline';
registerRoot(() => <>
 <Composition id="SpelunkDemo" component={SpelunkDemo} width={1280} height={720} fps={30} durationInFrames={1860}/>
 <Composition id="SpelunkFullDemo" component={FullDemo} width={1920} height={1080} fps={FPS} durationInFrames={Math.round(TOTAL*FPS)}/>
</>);
