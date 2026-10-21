'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { DoloresApiErrorState, DoloresEmptyState, DoloresLoadingState } from '@/app/_ui/dolores/DoloresApiState';
import {
  DoloresButton,
  DoloresField,
  DoloresFieldGrid,
  DoloresNotice,
  DoloresPanel,
  DoloresPanelTitle,
  DoloresTable,
} from '@/app/_ui/dolores/DoloresUI';
import { DoloresPage } from '@/app/_shell/dolores/DoloresShell';
import { PATH_ADMIN } from '@/routes/path';
import { buildRouteUrl } from '@/routes/query';
import { useRouteView } from '@/app/(admin)/admin/_components/useRouteView';
import { describeDoloresError } from '@/hooks/dolores/queryPolicy';
import { useGlobalRecipe, useGlobalRecipes, usePublishGlobalRecipe } from '@/hooks/dolores/useGlobalRecipes';
import type { AdminMenuView } from '@/routes/query';
import type { RecipePublishRequest } from '@/schemas/dolores/recipes';

export type { AdminMenuView } from '@/routes/query';

function lines(value: string): string[] {
  return value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
}

export default function AdminMenuScreens({
  initialView = 'list',
  initialRecipeId = null,
  basePath = PATH_ADMIN.menu,
}: {
  initialView?: AdminMenuView;
  initialRecipeId?: string | null;
  basePath?: string;
}) {
  const [view] = useRouteView<AdminMenuView>(initialView);
  const isListing = view === 'list' || view === 'items';
  const recipes = useGlobalRecipes(isListing);
  const recipeDetail = useGlobalRecipe(view === 'detail' ? initialRecipeId : null);
  const publish = usePublishGlobalRecipe();
  const [name, setName] = useState('');
  const [stepsText, setStepsText] = useState('');
  const [dosageBoundsText, setDosageBoundsText] = useState('');
  const [pendingRecipe, setPendingRecipe] = useState<RecipePublishRequest | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const publishDialogRef = useRef<HTMLDialogElement>(null);
  const publishCancelRef = useRef<HTMLButtonElement>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [publishError, setPublishError] = useState<unknown>(null);
  const [publishSuccess, setPublishSuccess] = useState<string | null>(null);

  useEffect(() => {
    setName('');
    setStepsText('');
    setDosageBoundsText('');
    setPendingRecipe(null);
    setConfirmOpen(false);
    setValidationError(null);
    setPublishError(null);
    setPublishSuccess(null);
  }, [initialView]);

  useEffect(() => {
    const dialog = publishDialogRef.current;
    if (!dialog) return;
    if (confirmOpen && !dialog.open) {
      dialog.showModal();
      publishCancelRef.current?.focus();
    } else if (!confirmOpen && dialog.open) {
      dialog.close();
    }
  }, [confirmOpen]);

  const linkTo = (nextView: AdminMenuView, id?: string) =>
    buildRouteUrl(basePath, { view: nextView, id });
  const description = 'Quản lý các công thức Global được chia sẻ trên nền tảng Dolores.';

  function preparePublish(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setValidationError(null);
    setPublishError(null);
    setPublishSuccess(null);
    const request: RecipePublishRequest = {
      name: name.trim(),
      steps: lines(stepsText),
      dosageBounds: lines(dosageBoundsText),
    };
    if (!request.name) {
      setValidationError('Nhập tên công thức trước khi tiếp tục.');
      return;
    }
    if (request.steps.length === 0) {
      setValidationError('Thêm ít nhất một bước pha chế trước khi tiếp tục.');
      return;
    }
    setPendingRecipe(request);
    setConfirmOpen(true);
  }

  function confirmPublish() {
    if (!pendingRecipe) return;
    setConfirmOpen(false);
    setPublishError(null);
    publish.mutate(pendingRecipe, {
      onSuccess: (created) => {
        setPublishSuccess(created.name);
        setPendingRecipe(null);
      },
      onError: (error) => setPublishError(error),
    });
  }

  if (isListing) {
    const rows = (recipes.data ?? []).map((recipe) => [
      <a className="font-semibold hover:text-[#B81724]" href={linkTo('detail', recipe.id)} key={recipe.id}>{recipe.name}</a>,
      recipe.steps.length,
      recipe.dosageBounds.length ? recipe.dosageBounds.join(' · ') : 'Không có giới hạn định lượng',
      <a className="font-medium text-[#B81724]" href={linkTo('detail', recipe.id)} key={'detail-' + recipe.id}>Xem chi tiết</a>,
    ]);

    return (
      <DoloresPage
        title="Global Menu & công thức"
        description={description}
        actions={<>
          <DoloresButton href={linkTo('add')}>Phát hành công thức</DoloresButton>
          <DoloresButton variant="secondary" onClick={() => void recipes.refetch()} disabled={recipes.isFetching}>Tải lại</DoloresButton>
        </>}
      >
        <DoloresPanel>
          <DoloresPanelTitle>Công thức Global</DoloresPanelTitle>
          {recipes.isPending && !recipes.data && <DoloresLoadingState />}
          {recipes.isError && <DoloresApiErrorState error={recipes.error} onRetry={() => void recipes.refetch()} />}
          {recipes.data?.length === 0 && <DoloresEmptyState message="API chưa trả về công thức Global nào." />}
          {recipes.data && recipes.data.length > 0 && <DoloresTable
            headers={['Công thức', 'Số bước', 'Giới hạn định lượng', 'Thao tác']}
            rows={rows}
          />}
        </DoloresPanel>
        <DoloresNotice title="Phạm vi thao tác">
          Phát hành recipe sẽ tạo công thức Global mới, biên dịch lại cấu hình liên quan và yêu cầu đồng bộ trên mọi máy. API không hỗ trợ sửa recipe tại chỗ hoặc gửi riêng một phiên bản menu đến một máy.
        </DoloresNotice>
      </DoloresPage>
    );
  }

  if (view === 'detail') {
    const recipe = recipeDetail.data;
    return (
      <DoloresPage
        title={recipe?.name ?? 'Chi tiết công thức Global'}
        description={description}
        actions={<DoloresButton href={linkTo('items')}>Về danh sách công thức</DoloresButton>}
      >
        {!initialRecipeId && <DoloresNotice title="Thiếu mã công thức" tone="warning">Mở chi tiết từ một công thức trong danh sách để tải đúng tài nguyên.</DoloresNotice>}
        {initialRecipeId && recipeDetail.isPending && !recipe && <DoloresLoadingState />}
        {initialRecipeId && recipeDetail.isError && <DoloresApiErrorState error={recipeDetail.error} onRetry={() => void recipeDetail.refetch()} />}
        {recipe && <>
          <DoloresPanel>
            <DoloresPanelTitle>Các bước pha chế</DoloresPanelTitle>
            <ol className="list-decimal space-y-2 pl-5 text-sm leading-6">
              {recipe.steps.map((step, index) => <li key={index}>{step}</li>)}
            </ol>
          </DoloresPanel>
          <DoloresPanel>
            <DoloresPanelTitle>Giới hạn định lượng</DoloresPanelTitle>
            {recipe.dosageBounds.length > 0
              ? <ul className="list-disc space-y-2 pl-5 text-sm leading-6">{recipe.dosageBounds.map((bound, index) => <li key={index}>{bound}</li>)}</ul>
              : <p className="text-sm text-[#706561]">Recipe không khai báo giới hạn định lượng.</p>}
          </DoloresPanel>
          <DoloresNotice title="Recipe Global không hỗ trợ sửa trực tiếp">
            API publish chỉ tạo recipe mới và từ chối ID đã tồn tại. Thay thế recipe cần xóa recipe cũ rồi phát hành recipe mới; trang này không tự thực hiện thao tác xóa.
          </DoloresNotice>
        </>}
      </DoloresPage>
    );
  }

  if (view === 'add') {
    return (
      <>
        <DoloresPage
          title="Phát hành công thức Global"
          description="Nhập đúng cấu trúc RecipePublishRequest của Dolores."
          actions={<>
            <DoloresButton href={linkTo('items')} variant="secondary">Hủy</DoloresButton>
          </>}
        >
          <form id="global-recipe-form" className="space-y-5" onSubmit={preparePublish}>
            <DoloresPanel>
              <DoloresPanelTitle>Thông tin công thức</DoloresPanelTitle>
              <DoloresFieldGrid>
                <DoloresField className="col-span-2" label="Tên công thức" required>
                  <input className="w-full bg-transparent text-sm outline-none" value={name} onChange={(event) => setName(event.target.value)} required />
                </DoloresField>
                <DoloresField className="col-span-2" label="Các bước pha chế · mỗi dòng là một bước" required>
                  <textarea className="min-h-28 w-full resize-y bg-transparent text-sm outline-none" value={stepsText} onChange={(event) => setStepsText(event.target.value)} placeholder={'GRIND:8s\nTAMP:12kg\nBREW:25s'} required />
                </DoloresField>
                <DoloresField className="col-span-2" label="Giới hạn định lượng · mỗi dòng là một giá trị">
                  <textarea className="min-h-24 w-full resize-y bg-transparent text-sm outline-none" value={dosageBoundsText} onChange={(event) => setDosageBoundsText(event.target.value)} placeholder={'bean:6:12\nwater:30:50'} />
                </DoloresField>
              </DoloresFieldGrid>
              <div className="mt-5">
                <DoloresButton type="submit" disabled={publish.isPending}>Kiểm tra và phát hành</DoloresButton>
              </div>
            </DoloresPanel>
            {validationError && <DoloresNotice title="Cần bổ sung thông tin" tone="warning">{validationError}</DoloresNotice>}
            {publish.isPending && <DoloresLoadingState />}
            {Boolean(publishError) && <DoloresNotice title="Chưa xác nhận phát hành thành công" tone="warning">
              <p>{describeDoloresError(publishError)}</p>
              <p className="mt-2">Tải lại danh sách để kiểm tra trạng thái trước khi gửi lại, tránh tạo recipe trùng.</p>
            </DoloresNotice>}
            {publishSuccess && <DoloresNotice title="Recipe đã được phát hành" tone="success">
              <p>{publishSuccess} đã được tạo. Máy chủ đã biên dịch lại cấu hình liên quan và yêu cầu đồng bộ đến mọi máy.</p>
              <div className="mt-3"><DoloresButton href={linkTo('items')}>Mở danh sách recipe</DoloresButton></div>
            </DoloresNotice>}
          </form>
        </DoloresPage>
        <dialog
          ref={publishDialogRef}
          className="m-auto w-[calc(100%-3rem)] max-w-[580px] rounded-[20px] border-0 bg-white p-8 shadow-xl backdrop:bg-[#302927]/25"
          aria-labelledby="recipe-publish-confirm-title"
          aria-describedby="recipe-publish-confirm-description"
          onCancel={(event) => {
            event.preventDefault();
            setConfirmOpen(false);
            setPendingRecipe(null);
          }}
        >
          {pendingRecipe && <>
            <p className="text-[11px] font-medium leading-4 text-[#706561]">Xác nhận tác động toàn hệ thống</p>
            <h2 id="recipe-publish-confirm-title" className="mt-3 text-xl font-semibold leading-7">Phát hành {pendingRecipe.name}?</h2>
            <p id="recipe-publish-confirm-description" className="mt-3 text-[13px] leading-5 text-[#302927]">API sẽ tạo Global Recipe mới, biên dịch lại effective recipes liên quan và yêu cầu đồng bộ trên tất cả máy. Thao tác này không giới hạn vào một tenant hoặc máy.</p>
            <div className="mt-5 flex flex-wrap gap-3">
              <DoloresButton type="button" onClick={confirmPublish} disabled={publish.isPending}>Xác nhận phát hành</DoloresButton>
              <button
                ref={publishCancelRef}
                type="button"
                className="inline-flex h-12 shrink-0 items-center justify-center rounded-[10px] border border-[#E9E2DC] bg-white px-4 py-3 text-sm font-medium text-[#302927] transition-opacity hover:opacity-[0.88] active:opacity-[0.72] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B81724]"
                onClick={() => { setConfirmOpen(false); setPendingRecipe(null); }}
              >Quay lại</button>
            </div>
          </>}
        </dialog>
      </>
    );
  }

  const unsupportedEdit = view.startsWith('edit-');
  return (
    <DoloresPage
      title={unsupportedEdit ? 'Không thể sửa Global Recipe tại chỗ' : 'Thao tác menu này chưa được API hỗ trợ'}
      description={description}
      actions={<DoloresButton href={linkTo('items')}>Về danh sách công thức</DoloresButton>}
    >
      <DoloresNotice title={unsupportedEdit ? 'API không có thao tác cập nhật recipe' : 'Không có API gửi menu riêng đến máy'} tone="warning">
        {unsupportedEdit
          ? 'Backend từ chối publish lại cùng một ID. Thay thế cần xóa recipe đang dùng rồi phát hành bản mới và có thể yêu cầu đồng bộ trên mọi máy; luồng hiện tại không tự xóa recipe.'
          : 'Không có menu-version hoặc thao tác gửi recipe riêng theo máy trong hợp đồng đang dùng. Publish Global Recipe sẽ yêu cầu đồng bộ toàn hệ thống.'}
      </DoloresNotice>
    </DoloresPage>
  );
}
