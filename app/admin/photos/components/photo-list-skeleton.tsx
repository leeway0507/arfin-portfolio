'use client'

type PhotoListSkeletonProps = {
    count?: number
}

export function PhotoListSkeleton({ count = 8 }: PhotoListSkeletonProps) {
    return (
        <div className="flex flex-wrap gap-2 sm:gap-4" aria-busy="true">
            {Array.from({ length: count }, (_, i) => (
                <div
                    key={i}
                    className="h-[100px] w-[75px] rounded-lg bg-muted animate-pulse sm:h-[240px] sm:w-[180px]"
                />
            ))}
        </div>
    )
}
