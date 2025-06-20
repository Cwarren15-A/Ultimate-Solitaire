"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, TrendingUp, Eye, Zap, BookOpen, Target } from "lucide-react";
import { type EnhancedHintResponse } from "@/lib/useHint";

interface EnhancedHintDisplayProps {
  isVisible: boolean;
  hintData: EnhancedHintResponse | null;
  onClose: () => void;
  onApplyHint?: (move: any) => void;
}

export default function EnhancedHintDisplay({ 
  isVisible, 
  hintData, 
  onClose, 
  onApplyHint 
}: EnhancedHintDisplayProps) {
  const [selectedTab, setSelectedTab] = useState<'quick' | 'detailed' | 'strategy'>('quick');
  const [showAlternatives, setShowAlternatives] = useState(false);

  if (!isVisible || !hintData) return null;

  const tabs = [
    { id: 'quick', label: 'Quick Tip', icon: Zap },
    { id: 'detailed', label: 'Analysis', icon: Brain },
    { id: 'strategy', label: 'Strategy', icon: BookOpen }
  ];

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'text-red-400 bg-red-500/20';
      case 'high': return 'text-orange-400 bg-orange-500/20';
      case 'medium': return 'text-yellow-400 bg-yellow-500/20';
      default: return 'text-gray-400 bg-gray-500/20';
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'high': return 'text-red-400';
      case 'medium': return 'text-orange-400';
      case 'low': return 'text-green-400';
      default: return 'text-gray-400';
    }
  };

  return typeof window !== 'undefined' ? createPortal(
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50"
        style={{ zIndex: 99999999 }}
        onClick={onClose}
      />
      
      {/* Hint Panel */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: -20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: -20 }}
        className="fixed top-4 right-4 w-96 max-h-[80vh] bg-gray-900 border-2 border-purple-400 
                   rounded-xl shadow-2xl overflow-hidden"
        style={{ zIndex: 99999999 + 1 }}
        onClick={(e) => e.stopPropagation()}
      >
      {/* Header with tabs */}
      <div className="bg-gradient-to-r from-purple-600/20 to-blue-600/20 p-4 border-b border-purple-500/30">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <Brain className="h-5 w-5 text-purple-400" />
            <span className="text-lg font-semibold text-white">AI Strategist</span>
            {hintData.priority && (
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(hintData.priority)}`}>
                {hintData.priority.toUpperCase()}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors w-8 h-8 
                       flex items-center justify-center rounded hover:bg-gray-700/50"
          >
            ×
          </button>
        </div>
        
        {/* Tab Navigation */}
        <div className="flex space-x-1 bg-gray-800/50 rounded-lg p-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setSelectedTab(tab.id as any)}
                className={`flex-1 flex items-center justify-center space-x-1 px-3 py-2 rounded-md transition-all text-xs font-medium ${
                  selectedTab === tab.id
                    ? 'bg-purple-500/30 text-purple-200 shadow-sm'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/30'
                }`}
              >
                <Icon className="h-3 w-3" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Content Area */}
      <div className="p-4 max-h-96 overflow-y-auto">
        <AnimatePresence mode="wait">
          {selectedTab === 'quick' && (
            <motion.div
              key="quick"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              {/* Main Move Recommendation */}
              {hintData.move && (
                <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 p-4 rounded-lg border border-blue-500/20">
                  <div className="flex items-center space-x-2 mb-2">
                    <Target className="h-4 w-4 text-blue-400" />
                    <span className="text-sm font-medium text-blue-200">Recommended Move</span>
                  </div>
                  <p className="text-white font-medium">{hintData.move.description}</p>
                  {hintData.move.visualHint?.message && (
                    <p className="text-blue-300 text-sm mt-1 flex items-center space-x-1">
                      <span>💡</span>
                      <span>{hintData.move.visualHint.message}</span>
                    </p>
                  )}
                  {onApplyHint && (
                    <button
                      onClick={() => onApplyHint(hintData.move)}
                      className="mt-3 px-3 py-1 bg-blue-500/20 text-blue-200 rounded text-sm 
                                 hover:bg-blue-500/30 transition-colors border border-blue-500/30"
                    >
                      Apply This Move
                    </button>
                  )}
                </div>
              )}

              {/* Quick Stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-800/50 p-3 rounded-lg">
                  <div className="text-xs text-gray-400 mb-1">Win Probability</div>
                  <div className="text-lg font-bold text-green-400">
                    {hintData.analysis?.winProbability || 'Calculating...'}
                  </div>
                </div>
                <div className="bg-gray-800/50 p-3 rounded-lg">
                  <div className="text-xs text-gray-400 mb-1">Risk Level</div>
                  <div className={`text-lg font-bold ${getRiskColor(hintData.analysis?.deadlockRisk || 'low')}`}>
                    {(hintData.analysis?.deadlockRisk || 'low').toUpperCase()}
                  </div>
                </div>
              </div>

              {/* Hints Used */}
              <div className="text-center">
                <div className="text-xs text-gray-400">
                  Hints Used: {hintData.hintsUsed} / {hintData.hintsUsed + hintData.hintsRemaining}
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2 mt-1">
                  <div 
                    className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full"
                    style={{ 
                      width: `${(hintData.hintsUsed / (hintData.hintsUsed + hintData.hintsRemaining)) * 100}%` 
                    }}
                  />
                </div>
              </div>
            </motion.div>
          )}

          {selectedTab === 'detailed' && (
            <motion.div
              key="detailed"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              {/* AI Reasoning */}
              <div className="bg-gray-800/50 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-gray-200 mb-2 flex items-center space-x-1">
                  <Brain className="h-4 w-4" />
                  <span>AI Analysis</span>
                </h4>
                <p className="text-gray-300 text-sm leading-relaxed">{hintData.reasoning}</p>
              </div>

              {/* Hidden Cards Analysis */}
              {hintData.analysis?.hiddenCards && hintData.analysis.hiddenCards !== 'No hidden card data' && (
                <div className="bg-purple-900/30 p-4 rounded-lg border border-purple-600/30">
                  <h4 className="text-sm font-medium text-purple-200 mb-2 flex items-center space-x-1">
                    <Eye className="h-4 w-4" />
                    <span>Hidden Card Intelligence</span>
                  </h4>
                  <p className="text-purple-100 text-sm">{hintData.analysis.hiddenCards}</p>
                </div>
              )}

              {/* Alternative Moves */}
              {hintData.alternatives && hintData.alternatives.length > 0 && (
                <div className="space-y-2">
                  <button
                    onClick={() => setShowAlternatives(!showAlternatives)}
                    className="flex items-center space-x-2 text-sm text-gray-300 hover:text-white transition-colors"
                  >
                    <TrendingUp className="h-4 w-4" />
                    <span>Alternative Strategies ({hintData.alternatives.length})</span>
                    <span className={`transform transition-transform ${showAlternatives ? 'rotate-180' : ''}`}>
                      ↓
                    </span>
                  </button>
                  
                  <AnimatePresence>
                    {showAlternatives && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="space-y-2 overflow-hidden"
                      >
                        {hintData.alternatives.map((alt, i) => (
                          <div key={i} className="bg-gray-800/30 p-3 rounded border border-gray-600/30">
                            <div className="text-sm font-medium text-gray-200 mb-1">{alt.move}</div>
                            <div className="text-xs text-green-400 mb-1">✓ {alt.pros}</div>
                            <div className="text-xs text-red-400">✗ {alt.cons}</div>
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </motion.div>
          )}

          {selectedTab === 'strategy' && (
            <motion.div
              key="strategy"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              {/* Future Sequence */}
              {hintData.futureSequence && hintData.futureSequence.length > 0 && (
                <div className="bg-blue-900/20 p-4 rounded-lg border border-blue-600/30">
                  <h4 className="text-sm font-medium text-blue-200 mb-3 flex items-center space-x-1">
                    <BookOpen className="h-4 w-4" />
                    <span>Strategic Sequence</span>
                  </h4>
                  <div className="space-y-2">
                    {hintData.futureSequence.slice(0, 4).map((move, i) => (
                      <div key={i} className="flex items-center space-x-2">
                        <div className="bg-blue-500/20 text-blue-200 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
                          {i + 1}
                        </div>
                        <span className="text-blue-100 text-sm">{move}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Deadlock Analysis */}
              {hintData.deadlockStatus && (
                <div className="bg-gray-800/50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-200 mb-2">Deadlock Analysis</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Status:</span>
                      <span className={hintData.deadlockStatus.isDeadlocked ? 'text-red-400' : 'text-green-400'}>
                        {hintData.deadlockStatus.isDeadlocked ? 'Risk Detected' : 'Safe'}
                      </span>
                    </div>
                    {hintData.deadlockStatus.escapeRoutes && hintData.deadlockStatus.escapeRoutes.length > 0 && (
                      <div className="text-xs text-gray-300 mt-2">
                        <div className="text-gray-400 mb-1">Escape Routes:</div>
                        {hintData.deadlockStatus.escapeRoutes.slice(0, 2).map((route, i) => (
                          <div key={i} className="text-green-300">• {route}</div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Critical Cards */}
              {hintData.analysis?.criticalCards && hintData.analysis.criticalCards.length > 0 && (
                <div className="bg-yellow-900/20 p-4 rounded-lg border border-yellow-600/30">
                  <h4 className="text-sm font-medium text-yellow-200 mb-2">Key Cards to Watch</h4>
                  <div className="flex flex-wrap gap-2">
                    {hintData.analysis.criticalCards.slice(0, 6).map((card, i) => (
                      <span key={i} className="bg-yellow-500/20 text-yellow-200 px-2 py-1 rounded text-xs">
                        {card}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div className="bg-gray-800/50 px-4 py-3 border-t border-gray-600/30">
        <div className="flex items-center justify-between text-xs text-gray-400">
                          <span>Powered by GPT-4o mini</span>
          <span className="text-purple-300">{hintData.message}</span>
        </div>
      </div>
      </motion.div>
    </>,
    document.body
  ) : null;
} 