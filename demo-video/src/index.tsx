import {registerRoot,Composition} from 'remotion';
import {SpelunkDemo} from './video';
registerRoot(() => <Composition id="SpelunkDemo" component={SpelunkDemo} width={1280} height={720} fps={30} durationInFrames={1860}/>);
