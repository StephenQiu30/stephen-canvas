import { useAppFeedback } from "@/components/ui/app-feedback-provider";

import copy from "copy-to-clipboard";
import { useTranslation } from "react-i18next";

export function useCopyText() {
    const { message } = useAppFeedback();
    const { t } = useTranslation();

    return (value: string, successText = t("common.copied")) => {
        copy(value);
        message.success(successText);
    };
}
