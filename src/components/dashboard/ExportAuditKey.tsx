'use client';

import { useState } from 'react';
import { Download, Eye, Key, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface ExportAuditKeyProps {
  transactionId?: string;
  amount?: number;
  blindingFactor?: string;
  isDisabled?: boolean;
}

export function ExportAuditKey({ 
  transactionId, 
  amount = 0, 
  blindingFactor = '', 
  isDisabled = false 
}: ExportAuditKeyProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const exportViewingKey = async (txId: string, amt: number, blindFactor: string) => {
    setIsExporting(true);
    
    try {
      // Generate the audit data for selective disclosure
      const auditData = {
        protocol: "KiddyGuard-Shadow",
        version: "1.0",
        tx_signature: txId,
        amount: amt,
        currency: "USD1",
        proof_verification: "bulletproofs-v1",
        decryption_key: blindFactor, // The secret 'r' that unlocks the commitment
        timestamp: new Date().toISOString(),
        compliance_note: "This viewing key allows decryption of only this specific transaction amount. Full wallet history remains private.",
        verification_method: "Pedersen Commitment + Bulletproofs ZK Proof"
      };
      
      // Create downloadable JSON file
      const blob = new Blob([JSON.stringify(auditData, null, 2)], { 
        type: 'application/json' 
      });
      
      // Generate filename with transaction ID
      const filename = `KiddyGuard_Proof_${txId.slice(0, 8)}.json`;
      
      // Create download link and trigger download
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success(`Audit key exported: ${filename}`, {
        description: "Share this file with insurance providers for proof of payment."
      });
      
    } catch (error) {
      console.error('Error exporting audit key:', error);
      toast.error('Failed to export audit key');
    } finally {
      setIsExporting(false);
    }
  };

  const generatePreviewData = () => {
    if (!transactionId || !blindingFactor) return null;
    
    return {
      protocol: "KiddyGuard-Shadow",
      version: "1.0",
      tx_signature: transactionId,
      amount: amount,
      currency: "USD1",
      proof_verification: "bulletproofs-v1",
      decryption_key: blindingFactor.slice(0, 8) + '...', // Partially masked for preview
      timestamp: new Date().toISOString(),
      compliance_note: "This viewing key allows decryption of only this specific transaction amount.",
      verification_method: "Pedersen Commitment + Bulletproofs ZK Proof"
    };
  };

  const previewData = generatePreviewData();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Key className="h-5 w-5" />
          Selective Disclosure
        </CardTitle>
        <CardDescription>
          Export a viewing key for insurance providers without revealing your full wallet history
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4">
          <h4 className="font-semibold text-sm text-gray-900 mb-2">Privacy-First Compliance:</h4>
          <ul className="space-y-1 text-xs text-gray-600">
            <li>• Reveals only this specific transaction amount</li>
            <li>• Protects all other wallet history</li>
            <li>• Compatible with BPJS and insurance providers</li>
            <li>• Uses Zero-Knowledge proof verification</li>
          </ul>
        </div>

        <div className="flex gap-2">
          <Dialog open={showPreview} onOpenChange={setShowPreview}>
            <DialogTrigger asChild>
              <Button 
                variant="outline" 
                size="sm"
                disabled={!transactionId || !blindingFactor || isDisabled}
                className="flex-1"
              >
                <Eye className="h-4 w-4 mr-2" />
                Preview Key
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Viewing Key Preview</DialogTitle>
                <DialogDescription>
                  This is what the audit key will contain. The actual decryption key will be included in the downloaded file.
                </DialogDescription>
              </DialogHeader>
              {previewData && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <pre className="text-xs text-gray-700 overflow-x-auto">
                    {JSON.stringify(previewData, null, 2)}
                  </pre>
                </div>
              )}
            </DialogContent>
          </Dialog>

          <Button 
            onClick={() => exportViewingKey(transactionId!, amount, blindingFactor!)}
            disabled={!transactionId || !blindingFactor || isDisabled || isExporting}
            className="flex-1"
          >
            <Download className="h-4 w-4 mr-2" />
            {isExporting ? 'Exporting...' : 'Export Audit Key'}
          </Button>
        </div>

        {!transactionId && (
          <p className="text-xs text-amber-600 bg-amber-50 rounded p-2">
            Complete a transaction first to generate an audit key
          </p>
        )}

        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Shield className="h-3 w-3" />
          <span>Powered by ShadowWire ZK Proofs</span>
        </div>
      </CardContent>
    </Card>
  );
}
