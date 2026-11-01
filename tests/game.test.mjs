import {test} from 'node:test';
import assert from 'node:assert/strict';
import {scoreFor,dayOf,shiftDay,weekOf,participationStreak} from '../lib/game.ts';
test('binary scoring rewards calibrated confidence and penalizes confident mistakes',()=>{assert.equal(scoreFor(0,80,0),96);assert.equal(scoreFor(0,80,1),36);assert.equal(scoreFor(1,80,1),96);assert.equal(scoreFor(0,50,1),75);assert.equal(scoreFor(0,95,1),9.75)});
test('multi-outcome scoring remains bounded and symmetric',()=>{for(let c=0;c<3;c++)for(let y=0;y<3;y++)for(const confidence of [50,65,80,95]){const s=scoreFor(c,confidence,y,3);assert(s>=0&&s<=100);assert.equal(s,scoreFor((c+1)%3,confidence,(y+1)%3,3))}});
test('Turkey calendar dates do not depend on server timezone',()=>{assert.equal(dayOf(new Date('2026-11-01T22:00:00Z')),'2026-11-02');assert.equal(weekOf('2026-11-01'),'2026-10-26');assert.equal(shiftDay('2026-12-31',1),'2027-01-01')});
test('participation streak distinguishes played days from a rest day',()=>{assert.deepEqual(participationStreak(['2026-10-26','2026-10-27','2026-10-29'],'2026-10-29'),{length:4,played:3,pauses:1});assert.equal(participationStreak([],'2026-11-01').length,0);assert.equal(participationStreak(['2026-10-26','2026-10-28','2026-10-30'],'2026-10-30').length,3)});
