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
import type { PhotographProjectMetadata } from '@/lib/apis/photographs/types'
import { cn } from '@/lib/utils'
import { findKeyboardTargetId } from '../lib/photographs-management-state'

interface PhotographProjectTabsProps {
    sectionTitle: string
    projects: PhotographProjectMetadata[]
    selectedProjectId: string | null
    isNavigationBlocked: boolean
    isOrderEditingDisabled: boolean
    hasOrderChanges: boolean
    onSelectProject: (projectId: string) => void
    onReorderProjects: (activeProjectId: string, overProjectId: string) => void
    onRequestCreateProject: () => void
    onRequestManageProject: () => void
    onNavigationBlocked: () => void
}

interface SortablePhotographProjectTabProps {
    project: PhotographProjectMetadata
    projectIndex: number
    isSelected: boolean
    isOrderEditingDisabled: boolean
    onSelectProject: (projectId: string) => void
    onTabKeyDown: (event: ReactKeyboardEvent<HTMLButtonElement>, projectId: string) => void
}

export function PhotographProjectTabs({
    sectionTitle,
    projects,
    selectedProjectId,
    isNavigationBlocked,
    isOrderEditingDisabled,
    hasOrderChanges,
    onSelectProject,
    onReorderProjects,
    onRequestCreateProject,
    onRequestManageProject,
    onNavigationBlocked,
}: PhotographProjectTabsProps) {
    const handleRequestCreateProject = () => {
        if (isNavigationBlocked) {
            onNavigationBlocked()
            return
        }
        onRequestCreateProject()
    }

    const handleRequestManageProject = () => {
        if (!selectedProjectId || isNavigationBlocked) {
            if (isNavigationBlocked) onNavigationBlocked()
            return
        }
        onRequestManageProject()
    }

    return (
        <div className="border-b bg-background px-5 pt-4">
            <PhotographProjectTabHeading
                isManageDisabled={!selectedProjectId || isNavigationBlocked}
                onRequestCreateProject={handleRequestCreateProject}
                onRequestManageProject={handleRequestManageProject}
            />
            <PhotographProjectTabList
                projects={projects}
                sectionTitle={sectionTitle}
                selectedProjectId={selectedProjectId}
                isNavigationBlocked={isNavigationBlocked}
                isOrderEditingDisabled={isOrderEditingDisabled}
                onSelectProject={onSelectProject}
                onReorderProjects={onReorderProjects}
            />
            {hasOrderChanges ? <PhotographProjectOrderNotice /> : null}
        </div>
    )
}

function PhotographProjectTabHeading({
    isManageDisabled,
    onRequestCreateProject,
    onRequestManageProject,
}: {
    isManageDisabled: boolean
    onRequestCreateProject: () => void
    onRequestManageProject: () => void
}) {
    return (
        <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                    소주제
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                    핸들을 좌우로 끌어 공개 화면의 소주제 순서를 정합니다.
                </p>
            </div>
            <div className="flex flex-wrap gap-2">
                <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={isManageDisabled}
                    onClick={onRequestManageProject}
                >
                    <Settings2 aria-hidden="true" /> 선택 소주제 관리
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={onRequestCreateProject}>
                    <Plus aria-hidden="true" /> 소주제 추가
                </Button>
            </div>
        </div>
    )
}

function PhotographProjectTabList({
    projects,
    sectionTitle,
    selectedProjectId,
    isNavigationBlocked,
    isOrderEditingDisabled,
    onSelectProject,
    onReorderProjects,
}: {
    projects: PhotographProjectMetadata[]
    sectionTitle: string
    selectedProjectId: string | null
    isNavigationBlocked: boolean
    isOrderEditingDisabled: boolean
    onSelectProject: (projectId: string) => void
    onReorderProjects: (activeProjectId: string, overProjectId: string) => void
}) {
    const projectSensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
        useSensor(KeyboardSensor, {
            coordinateGetter: getHorizontalSortableKeyboardCoordinates,
        }),
    )

    const handleTabKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>, projectId: string) => {
        const nextProjectId = findKeyboardTargetId(
            event.key,
            projects.map((project) => project.id),
            projectId,
        )
        if (!nextProjectId) return
        event.preventDefault()
        onSelectProject(nextProjectId)
        if (isNavigationBlocked) return
        document.getElementById(getProjectTabId(nextProjectId))?.focus()
    }

    return (
        <div className="mt-4 border-t py-3">
            <DndContext
                sensors={projectSensors}
                collisionDetection={closestCenter}
                autoScroll={PROJECT_TAB_AUTO_SCROLL_OPTIONS}
                modifiers={PROJECT_TAB_DRAG_MODIFIERS}
                onDragEnd={(event) => handleProjectTabDragEnd(event, onReorderProjects)}
            >
                <SortableContext
                    items={projects.map((project) => project.id)}
                    strategy={horizontalListSortingStrategy}
                >
                    <div
                        className="flex min-w-0 gap-2 overflow-x-auto pb-1"
                        role="tablist"
                        aria-label={`${sectionTitle} 소주제`}
                        data-project-tab-scroll="true"
                    >
                        {projects.map((project, projectIndex) => (
                            <SortablePhotographProjectTab
                                key={project.id}
                                project={project}
                                projectIndex={projectIndex}
                                isSelected={project.id === selectedProjectId}
                                isOrderEditingDisabled={isOrderEditingDisabled}
                                onSelectProject={onSelectProject}
                                onTabKeyDown={handleTabKeyDown}
                            />
                        ))}
                    </div>
                </SortableContext>
            </DndContext>
        </div>
    )
}

function SortablePhotographProjectTab({
    project,
    projectIndex,
    isSelected,
    isOrderEditingDisabled,
    onSelectProject,
    onTabKeyDown,
}: SortablePhotographProjectTabProps) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: project.id,
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
                'flex min-w-52 shrink-0 overflow-hidden rounded-lg border transition-[border-color,background-color,box-shadow,opacity]',
                isSelected
                    ? 'border-black bg-black text-white'
                    : 'border-neutral-200 bg-white text-black hover:border-neutral-400',
                isDragging && 'z-20 opacity-60 shadow-lg',
            )}
        >
            <button
                id={getProjectTabId(project.id)}
                type="button"
                role="tab"
                aria-selected={isSelected}
                aria-controls="photograph-project-panel"
                tabIndex={isSelected ? 0 : -1}
                onClick={() => onSelectProject(project.id)}
                onKeyDown={(event) => onTabKeyDown(event, project.id)}
                className="min-w-0 flex-1 px-3 py-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-current"
            >
                <span className="block truncate text-xs font-semibold">{project.title}</span>
                <span
                    className={cn(
                        'mt-0.5 block truncate text-[10px]',
                        isSelected ? 'text-white/65' : 'text-muted-foreground',
                    )}
                >
                    {project.publication}
                </span>
            </button>
            <button
                type="button"
                aria-label={`${project.title} ${projectIndex + 1}번째 순서 이동`}
                title="좌우로 끌거나 키보드로 소주제 순서 이동"
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

function PhotographProjectOrderNotice() {
    return (
        <p className="border-t py-3 text-xs font-medium text-amber-700" role="status">
            소주제 순서를 저장하거나 취소한 뒤 프로젝트 내용을 편집할 수 있습니다.
        </p>
    )
}

function handleProjectTabDragEnd(
    event: DragEndEvent,
    onReorderProjects: (activeProjectId: string, overProjectId: string) => void,
) {
    if (!event.over || event.active.id === event.over.id) return
    onReorderProjects(String(event.active.id), String(event.over.id))
}

function restrictProjectTabDragToHorizontalAxis({ transform }: Parameters<Modifier>[0]) {
    return { ...transform, y: 0 }
}

function canAutoScrollProjectTabs(element: Element): boolean {
    return (
        element instanceof HTMLElement &&
        element.dataset.projectTabScroll === 'true' &&
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

function getProjectTabId(projectId: string): string {
    return `photograph-project-tab-${projectId}`
}

const PROJECT_TAB_DRAG_MODIFIERS: Modifier[] = [restrictProjectTabDragToHorizontalAxis]
const PROJECT_TAB_AUTO_SCROLL_OPTIONS = {
    activator: AutoScrollActivator.DraggableRect,
    canScroll: canAutoScrollProjectTabs,
    layoutShiftCompensation: { x: true, y: false },
    threshold: { x: 0.2, y: 0 },
}
