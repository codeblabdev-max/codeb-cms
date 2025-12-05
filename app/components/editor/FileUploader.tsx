import React, { useState, useCallback } from "react";
import { Button } from "~/components/ui/button";
import {
  Upload,
  X,
  File,
  Image as ImageIcon,
  FileText,
  Loader2,
  AlertCircle
} from "lucide-react";

interface UploadedFile {
  id: string;
  filename: string;
  originalName: string;
  path: string;
  thumbnailPath?: string;
  size: number;
  url: string;
  thumbnailUrl?: string;
}

interface FileUploaderProps {
  onFilesChange: (files: UploadedFile[]) => void;
  maxFiles?: number;
  maxFileSize?: number; // bytes
  acceptedTypes?: string[];
  initialFiles?: UploadedFile[];
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith("image/")) {
    return <ImageIcon className="h-5 w-5 text-blue-500" />;
  } else if (mimeType.includes("pdf")) {
    return <FileText className="h-5 w-5 text-red-500" />;
  } else {
    return <File className="h-5 w-5 text-gray-500" />;
  }
}

export function FileUploader({
  onFilesChange,
  maxFiles = 10,
  maxFileSize = 10 * 1024 * 1024, // 10MB
  acceptedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"],
  initialFiles = [],
}: FileUploaderProps) {
  const [files, setFiles] = useState<UploadedFile[]>(initialFiles);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const uploadFile = async (file: File): Promise<UploadedFile | null> => {
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "업로드 실패");
      }

      return result.file;
    } catch (err) {
      console.error("Upload error:", err);
      throw err;
    }
  };

  const handleFiles = useCallback(
    async (selectedFiles: FileList | null) => {
      if (!selectedFiles || selectedFiles.length === 0) return;

      setError(null);

      // 파일 수 제한 체크
      if (files.length + selectedFiles.length > maxFiles) {
        setError(`최대 ${maxFiles}개의 파일만 첨부할 수 있습니다.`);
        return;
      }

      // 파일 유효성 검사
      const validFiles: File[] = [];
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];

        if (!acceptedTypes.includes(file.type)) {
          setError(`지원하지 않는 파일 형식입니다: ${file.name}`);
          continue;
        }

        if (file.size > maxFileSize) {
          setError(`파일 크기가 너무 큽니다: ${file.name} (최대 ${formatFileSize(maxFileSize)})`);
          continue;
        }

        validFiles.push(file);
      }

      if (validFiles.length === 0) return;

      setUploading(true);

      try {
        const uploadPromises = validFiles.map((file) => uploadFile(file));
        const uploadedFiles = await Promise.all(uploadPromises);
        const successfulUploads = uploadedFiles.filter((f): f is UploadedFile => f !== null);

        const newFiles = [...files, ...successfulUploads];
        setFiles(newFiles);
        onFilesChange(newFiles);
      } catch (err) {
        setError("파일 업로드 중 오류가 발생했습니다.");
      } finally {
        setUploading(false);
      }
    },
    [files, maxFiles, maxFileSize, acceptedTypes, onFilesChange]
  );

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  const removeFile = useCallback(
    (fileId: string) => {
      const newFiles = files.filter((f) => f.id !== fileId);
      setFiles(newFiles);
      onFilesChange(newFiles);
    },
    [files, onFilesChange]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
    e.target.value = ""; // Reset input
  };

  return (
    <div className="space-y-4">
      {/* 드래그 앤 드롭 영역 */}
      <div
        className={`
          relative border-2 border-dashed rounded-lg p-6 text-center transition-colors
          ${dragActive
            ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
            : "border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500"
          }
          ${uploading ? "opacity-50 pointer-events-none" : ""}
        `}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          type="file"
          id="file-upload"
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          multiple
          accept={acceptedTypes.join(",")}
          onChange={handleInputChange}
          disabled={uploading}
        />

        <div className="flex flex-col items-center gap-2">
          {uploading ? (
            <>
              <Loader2 className="h-10 w-10 text-blue-500 animate-spin" />
              <p className="text-sm text-gray-600 dark:text-gray-400">업로드 중...</p>
            </>
          ) : (
            <>
              <Upload className="h-10 w-10 text-gray-400" />
              <p className="text-sm text-gray-600 dark:text-gray-400">
                파일을 드래그하여 놓거나{" "}
                <span className="text-blue-600 dark:text-blue-400 font-medium">클릭하여 선택</span>
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500">
                최대 {maxFiles}개, 각 파일 {formatFileSize(maxFileSize)} 이하
              </p>
            </>
          )}
        </div>
      </div>

      {/* 오류 메시지 */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <AlertCircle className="h-4 w-4 text-red-500" />
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="ml-auto h-6 w-6 p-0"
            onClick={() => setError(null)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* 업로드된 파일 목록 */}
      {files.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
            첨부된 파일 ({files.length}/{maxFiles})
          </p>
          <div className="space-y-2">
            {files.map((file) => (
              <div
                key={file.id}
                className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
              >
                {/* 썸네일 또는 아이콘 */}
                {file.thumbnailUrl ? (
                  <img
                    src={file.thumbnailUrl}
                    alt={file.originalName}
                    className="w-12 h-12 object-cover rounded"
                  />
                ) : (
                  <div className="w-12 h-12 flex items-center justify-center bg-gray-200 dark:bg-gray-700 rounded">
                    {getFileIcon(file.path.split(".").pop() || "")}
                  </div>
                )}

                {/* 파일 정보 */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                    {file.originalName}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {formatFileSize(file.size)}
                  </p>
                </div>

                {/* 삭제 버튼 */}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-gray-500 hover:text-red-500"
                  onClick={() => removeFile(file.id)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 숨겨진 입력 필드 - 폼 제출용 */}
      {files.map((file) => (
        <input key={file.id} type="hidden" name="fileIds" value={file.id} />
      ))}
    </div>
  );
}

FileUploader.displayName = "FileUploader";
