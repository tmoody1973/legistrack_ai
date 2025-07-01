import React from 'react';
import { VideoBriefingTab } from './VideoBriefingTab';
import type { Bill } from '../../../types';

interface BillVideoBriefingProps {
  bill: Bill;
}

export const BillVideoBriefing: React.FC<BillVideoBriefingProps> = ({ bill }) => {
  return <VideoBriefingTab bill={bill} />;
};