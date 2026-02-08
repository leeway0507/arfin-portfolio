'use client'

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'

type DeleteConfirmDialogProps = {
    open: boolean
    caption: string
    errorMessage?: string | null
    onClose: (confirmed: boolean) => void
}

export function DeleteConfirmDialog({
    open,
    caption,
    errorMessage,
    onClose,
}: DeleteConfirmDialogProps) {
    return (
        <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose(false)}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-destructive">
                        <Trash2 className="h-5 w-5" />
                        사진 삭제
                    </DialogTitle>
                    <DialogDescription className="pt-2">
                        정말로 이 사진을 삭제하시겠습니까? <br />
                        <span className="font-semibold text-foreground">
                            &quot;{caption}&quot;
                        </span>{' '}
                        사진이 영구적으로 삭제되며 복구할 수 없습니다.
                    </DialogDescription>
                </DialogHeader>
                {errorMessage && (
                    <div className="rounded-md bg-destructive/10 p-3">
                        <p className="text-sm font-medium text-destructive">{errorMessage}</p>
                    </div>
                )}
                <DialogFooter className="gap-2 sm:gap-0">
                    <Button variant="ghost" onClick={() => onClose(false)}>
                        취소
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={() => onClose(true)}
                        className="min-w-[80px]"
                    >
                        삭제
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
