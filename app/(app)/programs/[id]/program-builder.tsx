"use client"
import { NewExerciseDialog } from "@/components/new-exercise-dialog"
import { Button } from "@/components/ui/button"
import { ChevronLeft } from "lucide-react"
import Link from "next/link"
import { DuplicateDayDialog } from "./duplicate-day-dialog"
import { FunctionalBlockDialog } from "./functional-block-dialog"
import type { ProgramBuilderProps } from "./program-types"
import { TemplateDialog } from "./template-dialog"
import { TemplateEditor } from "./template-editor"
import { TemplateExerciseDialog } from "./template-exercise-dialog"
import { TemplateList } from "./template-list"
import { useProgramBuilder } from "./use-program-builder"

export function ProgramBuilder({ program, initialTemplates, exercises: initialExercises }: ProgramBuilderProps) {
  const {
    templates,
    exercises,
    selectedTemplate,
    templateExercises,
    setTemplateExercises,
    functionalBlocks,
    pending,
    dupOpen,
    setDupOpen,
    dupWeek,
    setDupWeek,
    dupDay,
    setDupDay,
    ffOpen,
    setFfOpen,
    ffKind,
    setFfKind,
    ffTitle,
    setFfTitle,
    ffSource,
    setFfSource,
    ffDetails,
    setFfDetails,
    ffDuration,
    setFfDuration,
    newTemplateName,
    setNewTemplateName,
    newTemplateWeek,
    setNewTemplateWeek,
    newTemplateDay,
    setNewTemplateDay,
    addTemplateOpen,
    setAddTemplateOpen,
    addExOpen,
    setAddExOpen,
    editingExercise,
    setEditingExercise,
    selectedExId,
    setSelectedExId,
    setsMin,
    setSetsMin,
    setsMax,
    setSetsMax,
    repsMin,
    setRepsMin,
    repsMax,
    setRepsMax,
    weightType,
    setWeightType,
    weightValue,
    setWeightValue,
    rpeTarget,
    setRpeTarget,
    exNotes,
    setExNotes,
    section,
    superset,
    setSuperset,
    percentText,
    setPercentText,
    totalRepsMin,
    setTotalRepsMin,
    totalRepsMax,
    setTotalRepsMax,
    exerciseError,
    newExOpen,
    setNewExOpen,
    newExName,
    setNewExName,
    newExMuscle,
    setNewExMuscle,
    selectTemplate,
    handleDuplicateDay,
    handleAddFunctionalBlock,
    handleRemoveFunctionalBlock,
    resetFfForm,
    handleAddTemplate,
    handleDeleteTemplate,
    validPrescription,
    handleAddExercise,
    handleRemoveExercise,
    handleCreateExercise,
    resetExForm,
    handleEditExercise,
    describeWeight,
    weeks,
  } = useProgramBuilder({ program, initialTemplates, exercises: initialExercises })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button render={<Link href="/programs" />} variant="ghost" size="icon">
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-xl font-bold">{program.name}</h1>
          <p className="text-sm text-muted-foreground">{program.totalWeeks} weeks</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Left: template list */}
        <TemplateList
          setAddTemplateOpen={setAddTemplateOpen}
          weeks={weeks}
          templates={templates}
          selectTemplate={selectTemplate}
          selectedTemplate={selectedTemplate}
          handleDeleteTemplate={handleDeleteTemplate}
        />

        {/* Right: exercise builder */}
        <TemplateEditor
          selectedTemplate={selectedTemplate}
          setDupWeek={setDupWeek}
          program={program}
          setDupDay={setDupDay}
          setDupOpen={setDupOpen}
          resetExForm={resetExForm}
          setAddExOpen={setAddExOpen}
          templateExercises={templateExercises}
          describeWeight={describeWeight}
          pending={pending}
          handleEditExercise={handleEditExercise}
          handleRemoveExercise={handleRemoveExercise}
          exercises={exercises}
          setTemplateExercises={setTemplateExercises}
          setFfOpen={setFfOpen}
          functionalBlocks={functionalBlocks}
          handleRemoveFunctionalBlock={handleRemoveFunctionalBlock}
        />
      </div>

      {/* Add Template Dialog */}
      <TemplateDialog
        addTemplateOpen={addTemplateOpen}
        setAddTemplateOpen={setAddTemplateOpen}
        newTemplateName={newTemplateName}
        setNewTemplateName={setNewTemplateName}
        weeks={weeks}
        newTemplateWeek={newTemplateWeek}
        setNewTemplateWeek={setNewTemplateWeek}
        newTemplateDay={newTemplateDay}
        setNewTemplateDay={setNewTemplateDay}
        handleAddTemplate={handleAddTemplate}
        pending={pending}
      />

      {/* Add Exercise to Template Dialog */}
      <TemplateExerciseDialog
        addExOpen={addExOpen}
        pending={pending}
        setAddExOpen={setAddExOpen}
        resetExForm={resetExForm}
        editingExercise={editingExercise}
        section={section}
        setEditingExercise={setEditingExercise}
        exercises={exercises}
        selectedExId={selectedExId}
        setSelectedExId={setSelectedExId}
        setNewExOpen={setNewExOpen}
        setsMin={setsMin}
        setSetsMin={setSetsMin}
        setsMax={setsMax}
        setSetsMax={setSetsMax}
        repsMin={repsMin}
        setRepsMin={setRepsMin}
        repsMax={repsMax}
        setRepsMax={setRepsMax}
        superset={superset}
        setSuperset={setSuperset}
        totalRepsMin={totalRepsMin}
        setTotalRepsMin={setTotalRepsMin}
        totalRepsMax={totalRepsMax}
        setTotalRepsMax={setTotalRepsMax}
        weightType={weightType}
        setWeightType={setWeightType}
        weightValue={weightValue}
        setWeightValue={setWeightValue}
        percentText={percentText}
        setPercentText={setPercentText}
        rpeTarget={rpeTarget}
        setRpeTarget={setRpeTarget}
        exNotes={exNotes}
        setExNotes={setExNotes}
        exerciseError={exerciseError}
        handleAddExercise={handleAddExercise}
        validPrescription={validPrescription}
      />

      {/* New Exercise Dialog */}
      <NewExerciseDialog
        newExOpen={newExOpen}
        setNewExOpen={setNewExOpen}
        newExName={newExName}
        setNewExName={setNewExName}
        newExMuscle={newExMuscle}
        setNewExMuscle={setNewExMuscle}
        handleCreateExercise={handleCreateExercise}
        pending={pending}
      />

      {/* Duplicate Day Dialog */}
      <DuplicateDayDialog
        dupOpen={dupOpen}
        setDupOpen={setDupOpen}
        selectedTemplate={selectedTemplate}
        weeks={weeks}
        dupWeek={dupWeek}
        setDupWeek={setDupWeek}
        dupDay={dupDay}
        setDupDay={setDupDay}
        handleDuplicateDay={handleDuplicateDay}
        pending={pending}
      />

      {/* Functional Fitness Dialog */}
      <FunctionalBlockDialog
        ffOpen={ffOpen}
        setFfOpen={setFfOpen}
        resetFfForm={resetFfForm}
        ffKind={ffKind}
        setFfKind={setFfKind}
        ffTitle={ffTitle}
        setFfTitle={setFfTitle}
        ffSource={ffSource}
        setFfSource={setFfSource}
        ffDuration={ffDuration}
        setFfDuration={setFfDuration}
        ffDetails={ffDetails}
        setFfDetails={setFfDetails}
        handleAddFunctionalBlock={handleAddFunctionalBlock}
        pending={pending}
      />
    </div>
  )
}
