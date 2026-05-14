"use client";

import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";

export function ConfirmDialog({
  open,
  title,
  description,
  confirmText = "Delete",
  loading,
  onCancel,
  onConfirm
}: {
  open: boolean;
  title: string;
  description: string;
  confirmText?: string;
  loading?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal
      open={open}
      title={title}
      description={description}
      onClose={onCancel}
      className="max-w-md"
      footer={
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
          <Button type="button" variant="destructive" onClick={onConfirm} disabled={loading}>
            {loading ? "Working..." : confirmText}
          </Button>
        </div>
      }
    >
      <p className="text-sm text-slate-600">This action cannot be undone.</p>
    </Modal>
  );
}
