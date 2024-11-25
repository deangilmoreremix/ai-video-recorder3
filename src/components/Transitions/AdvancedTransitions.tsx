import React from 'react';
import {
  TransitionSeries,
  TransitionComponent,
  dissolve,
  slide,
  wipe,
} from '@remotion/transitions';
import { interpolate, spring } from 'remotion';
import { Player } from '@remotion/player';

interface TransitionProps {
  from: React.ReactNode;
  to: React.ReactNode;
  type: 'dissolve' | 'slide' | 'wipe';
}

export const AdvancedTransition: React.FC<TransitionProps> = ({ from, to, type }) => {
  const getTransition = (): TransitionComponent => {
    switch (type) {
      case 'dissolve':
        return dissolve();
      case 'slide':
        return slide();
      case 'wipe':
        return wipe();
      default:
        return dissolve();
    }
  };

  return (
    <TransitionSeries>
      <TransitionSeries.Sequence durationInFrames={30}>
        {from}
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition
        durationInFrames={30}
        transition={getTransition()}
      />
      <TransitionSeries.Sequence durationInFrames={30}>
        {to}
      </TransitionSeries.Sequence>
    </TransitionSeries>
  );
};