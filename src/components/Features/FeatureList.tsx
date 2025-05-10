import React from 'react';
import { SilentRemoval } from '../Editor/SilentRemoval';
import { Captions } from '../Editor/Captions';
import { Chapters } from '../Editor/Chapters';
import { BRoll } from '../Editor/BRoll';
import { EndCards } from '../Editor/EndCards';
import { VideoEffects } from '../Effects/VideoEffects';
import { TransitionEffects } from '../Transitions/TransitionEffects';

export const FeatureList: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* First Row - 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div id="silent-removal">
          <SilentRemoval />
        </div>
        <div id="captions">
          <Captions />
        </div>
      </div>

      {/* Second Row - 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div id="chapters">
          <Chapters />
        </div>
        <div id="effects">
          <VideoEffects />
        </div>
      </div>

      {/* Third Row - 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div id="transitions">
          <TransitionEffects />
        </div>
        <div id="b-roll">
          <BRoll />
        </div>
      </div>

      {/* Fourth Row - 1 Column */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div id="end-cards">
          <EndCards />
        </div>
        {/* Empty column for balance - can be used for future components */}
        <div></div>
      </div>
    </div>
  );
};