/**
 * AppointmentDialog Test - Simplified version to test basic functionality
 */

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface AppointmentDialogTestProps {
  open: boolean
  onClose: () => void
}

export function AppointmentDialogTest({ open, onClose }: AppointmentDialogTestProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Test Dialog</DialogTitle>
        </DialogHeader>
        <div className="p-4">
          <p>This is a test dialog to see if basic dialog functionality works.</p>
          <div className="flex justify-end mt-4">
            <Button onClick={onClose}>Close</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}