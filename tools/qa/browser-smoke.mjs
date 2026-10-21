import puppeteer from 'puppeteer';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
const browser=await puppeteer.launch({executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--no-sandbox','--enable-webgl']});
const page=await browser.newPage();page.setDefaultTimeout(15000);const errors=[];
page.on('pageerror',e=>{errors.push(e.message);console.log('PAGE ERROR',e.stack)});
await mkdir('qa',{recursive:true});
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const game=fn=>page.evaluate(fn);
const scene=name=>page.waitForFunction(n=>window.__PETO_GAME__?.scene.isActive(n),{},name);
try{
 await page.setViewport({width:1200,height:1000,deviceScaleFactor:1});
 await page.goto(process.env.QA_URL||'http://127.0.0.1:5188/');await scene('MenuScene');await wait(400);
 await page.screenshot({path:'qa/menu-desktop.png'});
 await page.keyboard.press('Enter');await scene('SelectionScene');await wait(250);
 await page.screenshot({path:'qa/selection-desktop.png'});
 await page.keyboard.press('Enter');await scene('GameScene');await wait(300);
 await game(()=>{const s=window.__PETO_GAME__.scene.getScene('GameScene');s.spawnObstacle();s.invincibleUntil=15000;s.burst.charge(100);});
 await page.keyboard.press('e');
 assert.equal(await game(()=>window.__PETO_GAME__.scene.getScene('GameScene').burst.active),true);
 await page.keyboard.press('Escape');
 await wait(500);
 await page.waitForFunction(()=>window.__PETO_GAME__.scene.getScene('GameScene').isPaused);
 const snap=()=>{const s=window.__PETO_GAME__.scene.getScene('GameScene');return {y:s.obstacles.getChildren()[0].y,dist:s.distance,burst:s.burst.remaining,power:s.invincibleUntil};};
 const before=await game(snap);await wait(700);assert.deepEqual(await game(snap),before,'Pause must freeze physics, distance, burst and powerups');
 await page.screenshot({path:'qa/pause-desktop.png'});
 await page.keyboard.press('Escape');await page.waitForFunction(()=>!window.__PETO_GAME__.scene.getScene('GameScene').isPaused);await wait(300);assert.notEqual((await game(snap)).y,before.y);
 await game(()=>{const s=window.__PETO_GAME__.scene.getScene('GameScene');s.obstacleSpawnTimer=999999;s.obstacles.clear(true,true);s.invincibleUntil=0;});
 await page.keyboard.press('ArrowLeft');await wait(220);
 assert.equal(await game(()=>window.__PETO_GAME__.scene.getScene('GameScene').currentLane),0);
 await page.keyboard.press('ArrowUp');await wait(100);
 assert.equal(await game(()=>window.__PETO_GAME__.scene.getScene('GameScene').playerState),1);
 await wait(700);await page.keyboard.press('ArrowDown');await wait(100);
 assert.equal(await game(()=>window.__PETO_GAME__.scene.getScene('GameScene').playerState),2);
 await wait(650);
 // Restart repeatedly: scene event listeners must not accumulate.
 for(let i=0;i<3;i++){
  await game(()=>window.__PETO_GAME__.scene.getScene('GameScene').scene.restart({selectedFood:'beans',mode:'endless'}));await wait(150);
  assert.equal(await game(()=>window.__PETO_GAME__.scene.getScene('GameScene').events.listenerCount('input-left')),1);
 }
 await game(()=>{const s=window.__PETO_GAME__.scene.getScene('GameScene');s.invincibleUntil=60000;s.time.removeAllEvents();s.obstacleSpawnTimer=999999;s.itemSpawnTimer=999999;s.obstacles.clear(true,true);s.coins.clear(true,true);s.spawnObstacle();s.spawnItem();});
 await wait(1000);await page.screenshot({path:'qa/game-desktop.png'});
 // Each environment loads successfully.
 for(let i=1;i<4;i++) {await game(()=>window.__PETO_GAME__.scene.getScene('GameScene').transitionToNextStage());await wait(100);}
 assert.equal(await game(()=>window.__PETO_GAME__.scene.getScene('GameScene').bg1.displayTexture.key),'world-deep');
 await page.setViewport({width:390,height:844,deviceScaleFactor:2,isMobile:true,hasTouch:true});await scene('MenuScene');
 await game(()=>window.__PETO_GAME__.scene.getScene('MenuScene').scene.start('GameScene',{selectedFood:'beans',mode:'expedition'}));await scene('GameScene');await wait(250);
 await game(()=>{const s=window.__PETO_GAME__.scene.getScene('GameScene');s.obstacleSpawnTimer=999999;s.obstacles.clear(true,true);s.burst.remaining=0;s.burst.energy=100;});
 const tap=async(x,y)=>{const rect=await page.$eval('canvas',e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height};});await page.touchscreen.tap(rect.x+x/800*rect.w,rect.y+y/1200*rect.h);};
 await tap(65,1110);await wait(220);assert.equal(await game(()=>window.__PETO_GAME__.scene.getScene('GameScene').currentLane),0);
 await tap(400,1110);assert.equal(await game(()=>window.__PETO_GAME__.scene.getScene('GameScene').burst.active),true);
 assert.equal(await game(()=>window.__PETO_GAME__.scene.getScene('GameScene').playerState),0,'Burst touch must not also trigger slide');
 await page.screenshot({path:'qa/game-mobile.png'});
 await game(()=>{const s=window.__PETO_GAME__.scene.getScene('GameScene');s.mode='expedition';s.distance=3200;});await scene('GameOverScene');await wait(300);
 assert.equal(await game(()=>window.__PETO_GAME__.scene.getScene('GameOverScene').result.completed),true);
 await page.screenshot({path:'qa/completed-mobile.png'});
 for(const name of ['ShopScene','SettingsScene','LeaderboardScene','MenuScene']){
  await game(()=>window.__PETO_GAME__.scene.getScenes(true)[0].scene.start('MenuScene'));await scene('MenuScene');
  await page.evaluate(n=>window.__PETO_GAME__.scene.getScene('MenuScene').scene.start(n),name);await scene(name);await wait(250);
  await page.screenshot({path:`qa/${name}-mobile.png`});
 }
 assert.deepEqual(errors,[],'Browser runtime errors');
 console.log('PASS: desktop + mobile, controls, pause freeze, burst, restarts, four biomes, expedition completion, all menus. No runtime errors.');
}catch(e){console.error('FAIL',e);throw e;}finally{await browser.close();}
