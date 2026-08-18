'use client'

import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent } from 'react'
import {
    AutoScrollActivator,
    DndContext,
    KeyboardSensor,
    PointerSensor,
    closestCenter,
    type DragEndEvent,
    type Modifier,
    useSensor,
    useSensors,
} from '@dnd-kit/core'
import {
    SortableContext,
    horizontalListSortingStrategy,
    sortableKeyboardCoordinates,
    useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Plus, Settings2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { PhotographSectionMetadata } from '@/lib/apis/photographs/types'
import { cn } from '@/lib/utils'
import { findKeyboardTargetId } from '../lib/photographs-management-state'

interface PhotographSectionTabsProps {
    sections: PhotographSectionMetadata[]
    selectedSectionId: string | null
    isNavigationBlocked: boolean
    isOrderEditingDisabled: boolean
    hasOrderChanges: boolean
    onSelectSection: (sectionId: string) => void
    onReorderSections: (activeSectionId: string, overSectionId: string) => void
    onRequestCreateSection: () => void
    onRequestManageSection: () => void
    onNavigationBlocked: () => void
}

interface SortablePhotographSectionTabProps {
    section: PhotographSectionMetadata
    sectionIndex: number
    isSelected: boolean
    isOrderEditingDisabled: boolean
    onSelectSection: (sectionId: string) => void
    onTabKeyDown: (event: ReactKeyboardEvent<HTMLButtonElement>, sectionId: string) => void
}

export function PhotographSectionTabs({
    sections,
    selectedSectionId,
    isNavigationBlocked,
    isOrderEditingDisabled,
    hasOrderChanges,
    onSelectSection,
    onReorderSections,
    onRequestCreateSection,
    onRequestManageSection,
    onNavigationBlocked,
}: PhotographSectionTabsProps) {
    const handleRequestCreateSection = () => {
        if (isNavigationBlocked) {
            onNavigationBlocked()
            return
        }
        onRequestCreateSection()
    }

    const handleRequestManageSection = () => {
        if (!selectedSectionId || isNavigationBlocked) {
            if (isNavigationBlocked) onNavigationBlocked()
            return
        }
        onRequestManageSection()
    }

    return (
        <header className="border-b bg-background px-5 pt-5">
            <PhotographSectionTabHeading
                isManageDisabled={!selectedSectionId || isNavigationBlocked}
                onRequestCreateSection={handleRequestCreateSection}
                onRequestManageSection={handleRequestManageSection}
            />
            <PhotographSectionTabList
                sections={sections}
                selectedSectionId={selectedSectionId}
                isNavigationBlocked={isNavigationBlocked}
                isOrderEditingDisabled={isOrderEditingDisabled}
                onSelectSection={onSelectSection}
                onReorderSections={onReorderSections}
            />
            {hasOrderChanges ? <PhotographSectionOrderNotice /> : null}
        </header>
    )
}

function PhotographSectionTabHeading({
    isManageDisabled,
    onRequestCreateSection,
    onRequestManageSection,
}: {
    isManageDisabled: boolean
    onRequestCreateSection: () => void
    onRequestManageSection: () => void
}) {
    return (
        <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                    대주제
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                    핸들을 좌우로 끌어 공개 화면의 대주제 순서를 정합니다.
                </p>
            </div>
            <div className="flex flex-wrap gap-2">
                <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={isManageDisabled}
                    onClick={onRequestManageSection}
                >
                    <Settings2 aria-hidden="true" /> 선택 대주제 관리
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={onRequestCreateSection}>
                    <Plus aria-hidden="true" /> 대주제 추가
                </Button>
            </div>
        </div>
    )
}

function PhotographSectionTabList({
    sections,
    selectedSectionId,
    isNavigationBlocked,
    isOrderEditingDisabled,
    onSelectSection,
    onReorderSections,
}: {
    sections: PhotographSectionMetadata[]
    selectedSectionId: string | null
    isNavigationBlocked: boolean
    isOrderEditingDisabled: boolean
    onSelectSection: (sectionId: string) => void
    onReorderSections: (activeSectionId: string, overSectionId: string) => void
}) {
    const sectionSensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
        useSensor(KeyboardSensor, {
            coordinateGetter: getHorizontalSortableKeyboardCoordinates,
        }),
    )

    const handleTabKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>, sectionId: string) => {
        const nextSectionId = findKeyboardTargetId(
            event.key,
            sections.map((section) => section.id),
            sectionId,
        )
        if (!nextSectionId) return
        event.preventDefault()
        if (isNavigationBlocked) return
        onSelectSection(nextSectionId)
        document.getElementById(getSectionTabId(nextSectionId))?.focus()
    }

    if (sections.length === 0) {
        return (
            <p className="mt-4 pb-3 text-sm text-muted-foreground">
                아직 대주제가 없습니다. 첫 대주제를 추가해 주세요.
            </p>
        )
    }

    return (
        <DndContext
            sensors={sectionSensors}
            collisionDetection={closestCenter}
            autoScroll={SECTION_TAB_AUTO_SCROLL_OPTIONS}
            modifiers={SECTION_TAB_DRAG_MODIFIERS}
            onDragEnd={(event) => handleSectionTabDragEnd(event, onReorderSections)}
        >
            <SortableContext
                items={sections.map((section) => section.id)}
                strategy={horizontalListSortingStrategy}
            >
                <div
                    className="mt-4 flex gap-2 overflow-x-auto pb-3"
                    role="tablist"
                    aria-label="Photographs 대주제"
                    data-section-tab-scroll="true"
                >
                    {sections.map((section, sectionIndex) => (
                        <SortablePhotographSectionTab
                            key={section.id}
                            section={section}
                            sectionIndex={sectionIndex}
                            isSelected={section.id === selectedSectionId}
                            isOrderEditingDisabled={isOrderEditingDisabled}
                            onSelectSection={onSelectSection}
                            onTabKeyDown={handleTabKeyDown}
                        />
                    ))}
                </div>
            </SortableContext>
        </DndContext>
    )
}

function SortablePhotographSectionTab({
    section,
    sectionIndex,
    isSelected,
    isOrderEditingDisabled,
    onSelectSection,
    onTabKeyDown,
}: SortablePhotographSectionTabProps) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: section.id,
        disabled: isOrderEditingDisabled,
    })
    const sortableStyle: CSSProperties = {
        transform: CSS.Transform.toString(transform ? { ...transform, y: 0 } : transform),
        transition,
    }

    return (
        <div
            ref={setNodeRef}
            role="presentation"
            style={sortableStyle}
            className={cn(
                'flex shrink-0 overflow-hidden rounded-lg border transition-[border-color,background-color,box-shadow,opacity]',
                isSelected
                    ? 'border-black bg-black text-white'
                    : 'border-neutral-200 bg-white text-black hover:border-neutral-400',
                isDragging && 'z-20 opacity-60 shadow-lg',
            )}
        >
            <button
                id={getSectionTabId(section.id)}
                type="button"
                role="tab"
                aria-selected={isSelected}
                aria-controls="photograph-section-panel"
                tabIndex={isSelected ? 0 : -1}
                onClick={() => onSelectSection(section.id)}
                onKeyDown={(event) => onTabKeyDown(event, section.id)}
                className="px-3 py-2 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-current"
            >
                {section.title}
            </button>
            <button
                type="button"
                aria-label={`${section.title} ${sectionIndex + 1}번째 대주제 순서 이동`}
                title="좌우로 끌거나 키보드로 대주제 순서 이동"
                disabled={isOrderEditingDisabled}
                className={cn(
                    'flex w-9 touch-none items-center justify-center border-l focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-current disabled:cursor-default disabled:opacity-35',
                    isSelected ? 'border-white/20' : 'border-neutral-200',
                )}
                {...attributes}
                {...listeners}
            >
                <GripVertical className="size-3.5" aria-hidden="true" />
            </button>
        </div>
    )
}

function PhotographSectionOrderNotice() {
    return (
        <p className="border-t py-3 text-xs font-medium text-amber-700" role="status">
            대주제 순서를 저장하거나 취소한 뒤 대·소주제를 편집할 수 있습니다.
        </p>
    )
}

function handleSectionTabDragEnd(
    event: DragEndEvent,
    onReorderSections: (activeSectionId: string, overSectionId: string) => void,
) {
    if (!event.over || event.active.id === event.over.id) return
    onReorderSections(String(event.active.id), String(event.over.id))
}

function restrictSectionTabDragToHorizontalAxis({ transform }: Parameters<Modifier>[0]) {
    return { ...transform, y: 0 }
}

function canAutoScrollSectionTabs(element: Element): boolean {
    return (
        element instanceof HTMLElement &&
        element.dataset.sectionTabScroll === 'true' &&
        element.scrollWidth > element.clientWidth
    )
}

function getHorizontalSortableKeyboardCoordinates(
    event: KeyboardEvent,
    context: Parameters<typeof sortableKeyboardCoordinates>[1],
) {
    if (event.code === 'ArrowUp' || event.code === 'ArrowDown') {
        event.preventDefault()
        return undefined
    }
    return sortableKeyboardCoordinates(event, context)
}

function getSectionTabId(sectionId: string): string {
    return `photograph-section-tab-${sectionId}`
}

const SECTION_TAB_DRAG_MODIFIERS: Modifier[] = [restrictSectionTabDragToHorizontalAxis]
const SECTION_TAB_AUTO_SCROLL_OPTIONS = {
    activator: AutoScrollActivator.DraggableRect,
    canScroll: canAutoScrollSectionTabs,
    layoutShiftCompensation: { x: true, y: false },
    threshold: { x: 0.2, y: 0 },
}
