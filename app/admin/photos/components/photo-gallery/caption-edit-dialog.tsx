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
import { Pencil } from 'lucide-react'

type CaptionEditDialogProps = {
    open: boolean
    value: string
    onValueChange: (value: string) => void
    onClose: (action: 'save' | 'cancel') => void
}

export function CaptionEditDialog({ open, value, onValueChange, onClose }: CaptionEditDialogProps) {
    return (
        <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose('cancel')}>
            <DialogContent className="sm:max-w-[425px]">
                <form
                    onSubmit={(e) => {
                        e.preventDefault()
                        onClose('save')
                    }}
                >
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Pencil className="h-5 w-5" />
                            캡션 수정
                        </DialogTitle>
                        <DialogDescription>
                            포트폴리오에 표시되는 캡션을 수정합니다. 비우면 파일명 기반으로
                            표시됩니다.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-2 py-2">
                        <label htmlFor="caption-edit" className="text-sm font-medium leading-none">
                            캡션
                        </label>
                        <input
                            id="caption-edit"
                            type="text"
                            value={value}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                onValueChange(e.target.value)
                            }
                            placeholder=""
                            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        />
                    </div>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button type="button" variant="ghost" onClick={() => onClose('cancel')}>
                            취소
                        </Button>
                        <Button type="submit" className="min-w-[80px]">
                            저장
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
