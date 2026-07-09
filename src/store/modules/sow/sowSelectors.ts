import type { RootState } from "@/store/index";
import type { SOWState } from "./sowTypes";

export const selectSOW = (state: RootState): SOWState => state.sow;
export const selectSOWs = (state: RootState) => selectSOW(state).sows;
export const selectCurrentSOW = (state: RootState) => selectSOW(state).currentSOW;
export const selectSOWFeatureDocs = (state: RootState) => selectSOW(state).featureDocs;
export const selectCurrentFeatureDoc = (state: RootState) => selectSOW(state).currentFeatureDoc;
export const selectSOWGeneratingFeatures = (state: RootState) => selectSOW(state).generatingFeatures;
export const selectSOWFeatureStream = (state: RootState) => selectSOW(state).featureStream;
export const selectSOWExtractorStream = (state: RootState) => selectSOW(state).extractorStream;
export const selectSOWExtractorDone = (state: RootState) => selectSOW(state).extractorDone;
export const selectSOWIsGenerating = (state: RootState) => selectSOW(state).isGenerating;
export const selectSOWLoading = (state: RootState) => selectSOW(state).isLoading;
