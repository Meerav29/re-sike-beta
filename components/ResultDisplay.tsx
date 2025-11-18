
import React from 'react';
import { ClassificationResult, BinType } from '../types';
import { RecycleIcon } from './icons/RecycleIcon';
import { TrashIcon } from './icons/TrashIcon';
import { CompostIcon } from './icons/CompostIcon';
import { SpecialIcon } from './icons/SpecialIcon';
import { UnknownIcon } from './icons/UnknownIcon';

interface ResultDisplayProps {
  result: ClassificationResult;
  onReset: () => void;
}

const getBinDetails = (binType: BinType) => {
  switch (binType) {
    case BinType.RECYCLING:
      return { Icon: RecycleIcon, color: 'blue-500', bgColor: 'blue-900', borderColor: 'blue-700' };
    case BinType.LANDFILL:
      return { Icon: TrashIcon, color: 'gray-400', bgColor: 'gray-800', borderColor: 'gray-600' };
    case BinType.COMPOST:
      return { Icon: CompostIcon, color: 'green-500', bgColor: 'green-900', borderColor: 'green-700' };
    case BinType.SPECIAL:
      return { Icon: SpecialIcon, color: 'yellow-500', bgColor: 'yellow-900', borderColor: 'yellow-700' };
    default:
      return { Icon: UnknownIcon, color: 'purple-400', bgColor: 'purple-900', borderColor: 'purple-700' };
  }
};

const ResultDisplay: React.FC<ResultDisplayProps> = ({ result, onReset }) => {
  const { Icon, color, bgColor, borderColor } = getBinDetails(result.bin);

  return (
    <div className="w-full h-full flex flex-col justify-between p-4 sm:p-6 md:p-8 bg-gray-900">
      <div className="flex-grow flex items-center justify-center">
        <div className={`w-full max-w-md bg-gray-800 rounded-3xl shadow-2xl p-6 md:p-8 border border-gray-700 transform transition-all`}>
          <div className="text-center">
            <div className={`mx-auto w-24 h-24 rounded-full bg-${bgColor} border-4 border-${borderColor} flex items-center justify-center mb-6`}>
              <Icon className={`w-12 h-12 text-${color}`} />
            </div>
            <p className="text-lg text-gray-400">This is a...</p>
            <h1 className="text-3xl md:text-4xl font-bold text-white capitalize mb-2">{result.itemName}</h1>
            <p className="text-xl md:text-2xl font-semibold text-${color} mb-4">Put it in the {result.bin} bin</p>
            <div className="bg-gray-700 p-4 rounded-xl text-left">
                <p className="text-md text-gray-300">{result.reason}</p>
            </div>
          </div>
        </div>
      </div>
      <div className="flex-shrink-0 pt-6 text-center">
        <button 
          onClick={onReset} 
          className="bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-8 rounded-full text-lg transition-transform transform hover:scale-105"
        >
          Scan Another Item
        </button>
      </div>
    </div>
  );
};

export default ResultDisplay;
