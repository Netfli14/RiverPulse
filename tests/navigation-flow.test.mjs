import {test, after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import ts from 'typescript';

const root=fs.mkdtempSync(path.join(os.tmpdir(),'riverpulse-navigation-'));
const require=createRequire(import.meta.url);
fs.symlinkSync(path.resolve('node_modules'),path.join(root,'node_modules'),'dir');
for(const [name,sourcePath] of [['app-navigation','lib/app-navigation.ts'],['app-link','components/app-link.tsx']]){
  const source=fs.readFileSync(sourcePath,'utf8');
  const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText.replaceAll('@/lib/app-navigation','./app-navigation');
  fs.writeFileSync(path.join(root,name+'.js'),compiled);
}
const {APP_PATHS,appDestination}=require(path.join(root,'app-navigation.js'));
const {AppLink}=require(path.join(root,'app-link.js'));
const originalWindow=globalThis.window;
after(()=>{globalThis.window=originalWindow;fs.rmSync(root,{recursive:true,force:true})});

const origin='https://river-pulse-five.vercel.app';
const event=(changes={})=>({defaultPrevented:false,button:0,metaKey:false,ctrlKey:false,shiftKey:false,altKey:false,preventDefault(){this.defaultPrevented=true},...changes});
function browser(pathname='/'){
  const calls=[];
  globalThis.window={location:{href:origin+pathname,pathname,search:''},history:{pushState(...args){calls.push(['history',...args])}},scrollTo(value){calls.push(['scroll',value])}};
  return calls;
}

test('every public and protected RiverPulse view has a local destination',()=>{
  assert.equal(APP_PATHS.length,12);
  for(const pathname of APP_PATHS)assert.equal(appDestination(pathname,origin+'/'),pathname);
});
test('unrelated URLs, API endpoints, external links and anchors use normal browser navigation',()=>{
  for(const href of ['https://other.example/map','//other.example/map','mailto:team@example.com','javascript:alert(1)','/api/user-auth','/missing','/#live'])assert.equal(appDestination(href,origin+'/'),null);
});
test('trailing slashes resolve to existing views and preserve query strings',()=>{
  assert.equal(appDestination('/robots/rc-01/?source=map',origin+'/'),'/robots/rc-01?source=map');
  assert.equal(appDestination(origin+'/analytics',origin+'/map'),'/analytics');
});
test('an ordinary click updates history without reloading the document',()=>{
  const calls=browser('/map');const click=event();
  AppLink({href:'/robots/rc-01'}).props.onClick(click);
  assert.equal(click.defaultPrevented,true);
  assert.deepEqual(calls[0],['history',null,'','/robots/rc-01']);
  assert.equal(calls.filter(call=>call[0]==='history').length,1);
});
test('clicking the current view does not create duplicate history entries',()=>{
  const calls=browser('/map');const click=event();
  AppLink({href:'/map'}).props.onClick(click);
  assert.equal(click.defaultPrevented,true);
  assert.equal(calls.some(call=>call[0]==='history'),false);
});
test('modified clicks, new tabs and downloads retain native behaviour',()=>{
  for(const options of [{event:{ctrlKey:true}},{event:{metaKey:true}},{event:{shiftKey:true}},{event:{altKey:true}},{event:{button:1}},{props:{target:'_blank'}},{props:{download:'data'}}]){
    const calls=browser();const click=event(options.event);
    AppLink({href:'/map',...options.props}).props.onClick(click);
    assert.equal(click.defaultPrevented,false);
    assert.equal(calls.length,0);
  }
});
test('caller handlers can close the menu or cancel navigation',()=>{
  const calls=browser();const click=event();let called=0;
  AppLink({href:'/map',onClick(e){called++;e.preventDefault()}}).props.onClick(click);
  assert.equal(called,1);assert.equal(calls.length,0);
});
