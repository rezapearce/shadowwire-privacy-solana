'use client';

import { ScreeningDomain } from '@/types/screening';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Sun, Camera, Maximize, VolumeX } from 'lucide-react';

interface VideoInstructionModalProps {
  isOpen: boolean;
  onClose: () => void;
  domain?: ScreeningDomain;
}

export function VideoInstructionModal({
  isOpen,
  onClose,
  domain,
}: VideoInstructionModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>How to Record Clinical Evidence</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5">
              <Sun className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm font-medium">Light</p>
              <p className="text-sm text-muted-foreground">
                Ensure the room is well-lit. Avoid backlighting.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="mt-0.5">
              <Camera className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium">Angle</p>
              <p className="text-sm text-muted-foreground">
                Place camera at the child's eye level.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="mt-0.5">
              <Maximize className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium">Frame</p>
              <p className="text-sm text-muted-foreground">
                Keep the child's full body in the frame.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="mt-0.5">
              <VolumeX className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm font-medium">Sound</p>
              <p className="text-sm text-muted-foreground">
                Try to minimize background noise.
              </p>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button
            onClick={onClose}
            className="bg-teal-600 hover:bg-teal-700 text-white"
          >
            I Understand
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

