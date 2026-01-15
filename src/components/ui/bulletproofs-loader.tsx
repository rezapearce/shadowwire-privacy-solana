'use client';

import { useState, useEffect } from 'react';
import { Loader2, Shield, Eye, EyeOff, Zap } from 'lucide-react';

interface BulletproofsLoaderProps {
  isVisible: boolean;
  onComplete?: () => void;
  duration?: number; // Custom duration in ms
}

export function BulletproofsLoader({ 
  isVisible, 
  onComplete, 
  duration = 3000 
}: BulletproofsLoaderProps) {
  const [progress, setProgress] = useState(0);
  const [currentPhase, setCurrentPhase] = useState<'init' | 'generating' | 'verifying' | 'complete'>('init');

  useEffect(() => {
    if (!isVisible) {
      setProgress(0);
      setCurrentPhase('init');
      return;
    }

    // Phase timing
    const phases = {
      init: 0.1, // 10% - Initial setup
      generating: 0.7, // 70% - ZK Proof generation
      verifying: 0.2, // 20% - Verification
    };

    let startTime = Date.now();
    let animationFrame: number;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const totalProgress = Math.min(elapsed / duration, 1);

      setProgress(totalProgress * 100);

      // Update phases based on progress
      if (totalProgress < phases.init) {
        setCurrentPhase('init');
      } else if (totalProgress < phases.init + phases.generating) {
        setCurrentPhase('generating');
      } else if (totalProgress < 1) {
        setCurrentPhase('verifying');
      } else {
        setCurrentPhase('complete');
        onComplete?.();
        return;
      }

      animationFrame = requestAnimationFrame(animate);
    };

    animationFrame = requestAnimationFrame(animate);

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [isVisible, duration, onComplete]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full mb-4">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            Zero-Knowledge Proof Generation
          </h3>
          <p className="text-gray-600 text-sm">
            Creating Bulletproofs to hide your transaction amount
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">
              {currentPhase === 'init' && 'Initializing...'}
              {currentPhase === 'generating' && 'Generating ZK Proof...'}
              {currentPhase === 'verifying' && 'Verifying Proof...'}
              {currentPhase === 'complete' && 'Complete!'}
            </span>
            <span className="text-sm text-gray-500">{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Animated Icons */}
        <div className="flex justify-center space-x-4 mb-6">
          <div className={`transition-all duration-300 ${
            currentPhase === 'init' ? 'opacity-100 scale-100' : 'opacity-50 scale-75'
          }`}>
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <Loader2 className={`w-6 h-6 text-blue-600 ${currentPhase === 'init' ? 'animate-spin' : ''}`} />
            </div>
            <p className="text-xs text-gray-600 mt-1 text-center">Setup</p>
          </div>

          <div className={`transition-all duration-300 ${
            currentPhase === 'generating' ? 'opacity-100 scale-100' : 'opacity-50 scale-75'
          }`}>
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
              <Zap className={`w-6 h-6 text-purple-600 ${currentPhase === 'generating' ? 'animate-pulse' : ''}`} />
            </div>
            <p className="text-xs text-gray-600 mt-1 text-center">Generate</p>
          </div>

          <div className={`transition-all duration-300 ${
            currentPhase === 'verifying' ? 'opacity-100 scale-100' : 'opacity-50 scale-75'
          }`}>
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              {currentPhase === 'verifying' ? (
                <EyeOff className="w-6 h-6 text-green-600 animate-pulse" />
              ) : (
                <Eye className="w-6 h-6 text-green-600" />
              )}
            </div>
            <p className="text-xs text-gray-600 mt-1 text-center">Verify</p>
          </div>
        </div>

        {/* Privacy Benefits */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-semibold text-gray-900 mb-2 text-sm">Privacy Features Enabled:</h4>
          <ul className="space-y-1 text-xs text-gray-600">
            <li className="flex items-center">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2" />
              Amount hidden with Bulletproofs
            </li>
            <li className="flex items-center">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2" />
              Sender identity protected
            </li>
            <li className="flex items-center">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2" />
              Recipient identity protected
            </li>
          </ul>
        </div>

        {/* Cancel Button (only during generation) */}
        {currentPhase !== 'complete' && (
          <div className="mt-4 text-center">
            <button className="text-sm text-gray-500 hover:text-gray-700 transition-colors">
              Cancel Operation
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
