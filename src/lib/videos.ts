/** 폴더 피드에 표시할 최대 영상 수 */
export const FOLDER_VIDEO_LIMIT = 50;

/** 이보다 오래된 영상은 목록에서 제외 (개월) */
export const FOLDER_VIDEO_MAX_AGE_MONTHS = 3;

export function folderVideoSince(now = new Date()) {
  const since = new Date(now);
  since.setMonth(since.getMonth() - FOLDER_VIDEO_MAX_AGE_MONTHS);
  return since;
}
