from __future__ import annotations

import argparse
import json
import os
import sys
import tempfile
from pathlib import Path

from filelock import FileLock

from app.cutout_quality import analyze_cutout, save_qa_preview
from app.remover import (
    DEFAULT_TASK,
    MODEL_BY_ID,
    SUPPORTED_MODELS,
    TASK_BY_ID,
    RemoveOptions,
    remove_background,
    resolve_task_model,
)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="최고 품질 로컬 모델로 투명 PNG 누끼 결과를 생성합니다.",
    )
    parser.add_argument("--input", type=Path, help="원본 이미지 경로")
    parser.add_argument("--output", type=Path, help="투명 PNG 출력 경로")
    parser.add_argument(
        "--review-cutout",
        type=Path,
        help="모델 추론 없이 기존 수동 교정 PNG를 구조·시각 QA",
    )
    parser.add_argument(
        "--publish-cutout",
        type=Path,
        help="시각 QA에서 선택한 PNG를 구조 재검사 후 Downloads에 새 파일로 발행",
    )
    parser.add_argument("--task", choices=tuple(TASK_BY_ID), default=DEFAULT_TASK)
    parser.add_argument("--model", choices=SUPPORTED_MODELS)
    parser.add_argument("--qa-preview", type=Path, help="원본/체커/흰색/검정 QA 보드 경로")
    parser.add_argument("--force", action="store_true", help="기존 작업 산출물을 명시적으로 교체")
    parser.add_argument("--list-models", action="store_true")
    parser.add_argument("--list-tasks", action="store_true")
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    if args.list_models:
        _print_json(
            {
                "quality_policy": "maximum",
                "models": [model.to_payload() for model in MODEL_BY_ID.values()],
            }
        )
        return 0
    if args.list_tasks:
        _print_json({"tasks": [task.to_payload() for task in TASK_BY_ID.values()]})
        return 0
    if args.input is None:
        raise SystemExit("--input이 필요합니다.")
    requested_modes = tuple(
        path
        for path in (args.output, args.review_cutout, args.publish_cutout)
        if path is not None
    )
    if len(requested_modes) > 1:
        raise SystemExit("--output, --review-cutout, --publish-cutout 중 하나만 사용할 수 있습니다.")
    if not requested_modes:
        raise SystemExit("--output, --review-cutout, --publish-cutout 중 하나가 필요합니다.")

    source_path = args.input.expanduser().resolve()
    qa_path = args.qa_preview.expanduser().resolve() if args.qa_preview else None
    if not source_path.is_file():
        raise SystemExit(f"입력 파일을 찾을 수 없습니다: {source_path}")
    if args.publish_cutout is not None:
        if qa_path is not None:
            raise SystemExit("발행 모드에서는 --qa-preview를 사용하지 않습니다. 선택 전에 QA를 완료하세요.")
        if args.force:
            raise SystemExit("발행 모드에서는 --force를 사용하지 않습니다. 이름 충돌 시 새 번호를 붙입니다.")
        return _publish_cutout_to_downloads(source_path, args.publish_cutout)
    if args.review_cutout is not None:
        return _review_existing_cutout(source_path, args.review_cutout, qa_path, args.force)

    output_path = args.output.expanduser().resolve()
    if output_path.suffix.lower() != ".png":
        raise SystemExit("누끼 출력 경로는 .png 확장자여야 합니다.")
    if qa_path is not None and qa_path.suffix.lower() != ".png":
        raise SystemExit("QA 보드 경로는 .png 확장자여야 합니다.")
    if source_path == output_path:
        raise SystemExit("원본 파일과 출력 파일은 달라야 합니다.")
    if qa_path is not None and qa_path in {source_path, output_path}:
        raise SystemExit("QA 보드는 원본 및 누끼 출력과 다른 경로여야 합니다.")
    if output_path.exists() and not args.force:
        raise SystemExit(f"출력 파일이 이미 있습니다. 교체하려면 --force를 사용하세요: {output_path}")
    if qa_path is not None and qa_path.exists() and not args.force:
        raise SystemExit(f"QA 보드가 이미 있습니다. 교체하려면 --force를 사용하세요: {qa_path}")

    selection_mode = "model" if args.model else "task"
    selected_task = None if args.model else args.task
    model = MODEL_BY_ID[args.model] if args.model else resolve_task_model(args.task)
    source = source_path.read_bytes()
    result = remove_background(source, RemoveOptions(model_name=model.id))
    output_path.parent.mkdir(parents=True, exist_ok=True)
    _atomic_write(output_path, result.png)
    report = analyze_cutout(source, result.png)
    if qa_path is not None:
        save_qa_preview(source, result.png, qa_path)

    _print_json(
        {
            "input": str(source_path),
            "output": str(output_path),
            "qa_preview": str(qa_path) if qa_path else None,
            "selection_mode": selection_mode,
            "task": selected_task,
            "requested_model": args.model,
            "model": result.model_name,
            "fallback_model": model.fallback_model,
            "quality_policy": "maximum",
            "elapsed_ms": result.elapsed_ms,
            "visual_review_required": True,
            "quality": report.to_payload(),
        }
    )
    return 0


def _review_existing_cutout(
    source_path: Path,
    cutout_argument: Path,
    qa_path: Path | None,
    force: bool,
) -> int:
    cutout_path = cutout_argument.expanduser().resolve()
    if not cutout_path.is_file():
        raise SystemExit(f"검수할 누끼 파일을 찾을 수 없습니다: {cutout_path}")
    if cutout_path.suffix.lower() != ".png":
        raise SystemExit("검수할 누끼 파일은 .png 확장자여야 합니다.")
    if source_path == cutout_path:
        raise SystemExit("원본과 검수할 누끼 파일은 달라야 합니다.")
    if qa_path is not None and qa_path.suffix.lower() != ".png":
        raise SystemExit("QA 보드 경로는 .png 확장자여야 합니다.")
    if qa_path is not None and qa_path in {source_path, cutout_path}:
        raise SystemExit("QA 보드는 원본 및 검수할 누끼 파일과 다른 경로여야 합니다.")
    if qa_path is not None and qa_path.exists() and not force:
        raise SystemExit(f"QA 보드가 이미 있습니다. 교체하려면 --force를 사용하세요: {qa_path}")

    source = source_path.read_bytes()
    cutout = cutout_path.read_bytes()
    report = analyze_cutout(source, cutout)
    if qa_path is not None:
        save_qa_preview(source, cutout, qa_path)
    _print_json(
        {
            "input": str(source_path),
            "output": str(cutout_path),
            "qa_preview": str(qa_path) if qa_path else None,
            "mode": "review-only",
            "quality_policy": "maximum",
            "visual_review_required": True,
            "quality": report.to_payload(),
        }
    )
    return 0


_DOWNLOAD_PUBLISH_LOCK = FileLock(
    Path(tempfile.gettempdir()) / "toolbox-cutout-publish.lock",
)


def _publish_cutout_to_downloads(source_path: Path, cutout_argument: Path) -> int:
    cutout_path = cutout_argument.expanduser().resolve()
    if not cutout_path.is_file():
        raise SystemExit(f"발행할 누끼 파일을 찾을 수 없습니다: {cutout_path}")
    if cutout_path.suffix.lower() != ".png":
        raise SystemExit("발행할 누끼 파일은 .png 확장자여야 합니다.")
    if source_path == cutout_path:
        raise SystemExit("원본과 발행할 누끼 파일은 달라야 합니다.")

    source = source_path.read_bytes()
    cutout = cutout_path.read_bytes()
    report = analyze_cutout(source, cutout)
    if not report.structurally_valid:
        reason = " ".join(report.warnings) or "투명 배경과 보이는 피사체 조건을 충족하지 않습니다."
        raise SystemExit(f"선택 파일이 구조 QA를 통과하지 못해 발행하지 않았습니다: {reason}")

    downloads = _downloads_directory().expanduser().resolve()
    downloads.mkdir(parents=True, exist_ok=True)
    stem = source_path.stem.strip().lstrip(".") or "cutout"
    base_name = f"{stem}-cutout"
    sequence = 1
    with _DOWNLOAD_PUBLISH_LOCK:
        while True:
            suffix = "" if sequence == 1 else f"-{sequence}"
            output_path = downloads / f"{base_name}{suffix}.png"
            try:
                _atomic_write_new(output_path, cutout)
                break
            except FileExistsError:
                sequence += 1

    _print_json(
        {
            "input": str(source_path),
            "selected_cutout": str(cutout_path),
            "output": str(output_path),
            "mode": "publish",
            "collision_renamed": sequence > 1,
            "quality_policy": "maximum",
            "quality": report.to_payload(),
        }
    )
    return 0


def _downloads_directory() -> Path:
    return Path.home() / "Downloads"


def _atomic_write(target: Path, contents: bytes) -> None:
    descriptor, temporary_name = tempfile.mkstemp(
        dir=target.parent,
        prefix=f".{target.stem}-",
        suffix=".tmp",
    )
    temporary_path = Path(temporary_name)
    try:
        with os.fdopen(descriptor, "wb") as handle:
            handle.write(contents)
            handle.flush()
            os.fsync(handle.fileno())
        temporary_path.replace(target)
    except Exception:
        temporary_path.unlink(missing_ok=True)
        raise


def _atomic_write_new(target: Path, contents: bytes) -> None:
    descriptor, temporary_name = tempfile.mkstemp(
        dir=target.parent,
        prefix=f".{target.stem}-",
        suffix=".tmp",
    )
    temporary_path = Path(temporary_name)
    try:
        with os.fdopen(descriptor, "wb") as handle:
            handle.write(contents)
            handle.flush()
            os.fsync(handle.fileno())
        os.link(temporary_path, target)
    finally:
        temporary_path.unlink(missing_ok=True)


def _print_json(payload: dict[str, object]) -> None:
    print(json.dumps(payload, ensure_ascii=False, sort_keys=True))


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except KeyboardInterrupt:
        print("누끼 작업이 중단되었습니다.", file=sys.stderr)
        raise SystemExit(130)
