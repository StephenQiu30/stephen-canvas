"use client";

import { AlertCircle, ChevronDown, ChevronLeft, ChevronRight, Image as ImageIcon, LoaderCircle, X } from "lucide-react";
import * as React from "react";
import { createContext, forwardRef, useContext, useEffect, useState, useSyncExternalStore, type CSSProperties, type ReactElement, type ReactNode } from "react";
import { cn } from "cn";

import { Alert as UiAlert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button as UiButton } from "@/components/ui/button";
import { Card as UiCard, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox as UiCheckbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input as UiInput } from "@/components/ui/input";
import { Popover as UiPopover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Progress as UiProgress } from "@/components/ui/progress";
import { Select as UiSelect, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Slider as UiSlider } from "@/components/ui/slider";
import { Switch as UiSwitch } from "@/components/ui/switch";
import { Tabs as UiTabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea as UiTextarea } from "@/components/ui/textarea";
import { ToggleGroup as UiToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip as UiTooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Spinner } from "@/components/ui/spinner";

type ChildrenProps = { children?: ReactNode; className?: string; style?: CSSProperties };

type ButtonProps = Omit<React.ComponentProps<typeof UiButton>, "size" | "variant" | "type"> & {
    type?: "default" | "primary" | "text" | "link" | "dashed";
    variant?: "default" | "link" | "outline" | "secondary" | "destructive" | "ghost";
    size?: "default" | "small" | "middle" | "large" | "sm" | "lg" | "icon" | "icon-sm" | "icon-lg";
    htmlType?: "button" | "submit" | "reset";
    shape?: "default" | "circle" | "round";
    danger?: boolean;
    ghost?: boolean;
    loading?: boolean | { delay?: number };
    icon?: ReactNode;
    iconPlacement?: "start" | "end";
    block?: boolean;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
    { type = "default", variant: customVariant, htmlType = "button", size = "default", shape, danger, ghost, loading, disabled, icon, iconPlacement = "start", block, className, children, ...props },
    ref,
) {
    const variant = danger ? "destructive" : customVariant || (type === "primary" ? "default" : type === "text" ? "ghost" : type === "link" ? "link" : type === "dashed" ? "outline" : ghost ? "outline" : "secondary");
    const buttonSize = size === "large" ? "lg" : size === "small" || size === "middle" ? "sm" : size;

    return (
        <UiButton ref={ref} type={htmlType} variant={variant} size={buttonSize} disabled={Boolean(loading) || disabled} className={cn(block && "w-full", shape === "circle" && "rounded-full", shape === "round" && "rounded-full", className)} {...props}>
            {loading ? (
                <span className="ui-button-icon">
                    <LoaderCircle className="size-4 animate-spin" />
                </span>
            ) : icon && iconPlacement === "start" ? (
                <span className="ui-button-icon">{icon}</span>
            ) : null}
            {children ? <span className="ui-button-content">{children}</span> : null}
            {icon && iconPlacement === "end" ? <span className="ui-button-icon">{icon}</span> : null}
        </UiButton>
    );
});

type InputProps = Omit<React.ComponentProps<"input">, "size"> & { size?: "small" | "middle" | "large"; prefix?: ReactNode; suffix?: ReactNode; allowClear?: boolean; showCount?: boolean };

const InputBase = forwardRef<HTMLInputElement, InputProps>(function Input({ className, size = "middle", prefix, suffix, allowClear, showCount, value, defaultValue, onChange, ...props }, ref) {
    const [innerValue, setInnerValue] = useState(String(defaultValue ?? ""));
    const controlledValue = value === undefined ? innerValue : String(value ?? "");
    const sizeClass = size === "large" ? "h-10" : size === "small" ? "h-7 text-xs" : "h-8";
    const input = (
        <UiInput
            ref={ref}
            value={value === undefined ? innerValue : value}
            onChange={(event) => {
                if (value === undefined) setInnerValue(event.target.value);
                onChange?.(event);
            }}
            className={cn(
                "px-3 text-sm",
                sizeClass,
                prefix && "pl-2",
                suffix && "pr-2",
                className,
            )}
            {...props}
        />
    );

    if (!prefix && !suffix && !allowClear && !showCount) return input;
    return (
        <div className="flex min-w-0 items-center gap-2 rounded-lg border border-input px-2 focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/30">
            {prefix ? <span className="shrink-0 text-muted-foreground">{prefix}</span> : null}
            <div className="min-w-0 flex-1 [&_input]:border-0 [&_input]:px-1 [&_input]:shadow-none [&_input]:focus-visible:ring-0">{input}</div>
            {allowClear && controlledValue ? (
                <button
                    type="button"
                    aria-label="清空"
                    onClick={() => {
                        setInnerValue("");
                        onChange?.({ target: { value: "" } } as React.ChangeEvent<HTMLInputElement>);
                    }}
                >
                    <X className="size-3.5 text-muted-foreground" />
                </button>
            ) : null}
            {suffix ? <span className="shrink-0 text-muted-foreground">{suffix}</span> : null}
            {showCount ? (
                <span className="shrink-0 text-xs text-muted-foreground">
                    {controlledValue.length}
                    {props.maxLength ? ` / ${props.maxLength}` : ""}
                </span>
            ) : null}
        </div>
    );
});

type TextAreaProps = React.ComponentProps<"textarea"> & { autoSize?: boolean | { minRows?: number; maxRows?: number }; showCount?: boolean };

const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(function TextArea({ className, autoSize, showCount, rows = 3, value, onChange, ...props }, ref) {
    const minRows = typeof autoSize === "object" ? autoSize.minRows : undefined;
    const maxRows = typeof autoSize === "object" ? autoSize.maxRows : undefined;
    const displayValue = String(value ?? "");
    return (
        <div className="relative">
            <UiTextarea
                ref={ref}
                rows={minRows || rows}
                value={value}
                onChange={onChange}
                className={cn(
                    "min-h-0 px-3 py-2 text-sm leading-5",
                    autoSize && "resize-y",
                    showCount && "pb-6",
                    className,
                )}
                style={maxRows ? { maxHeight: `${maxRows * 1.25}rem` } : undefined}
                {...props}
            />
            {showCount ? (
                <span className="absolute right-2 bottom-2 text-xs text-muted-foreground">
                    {displayValue.length}
                    {props.maxLength ? ` / ${props.maxLength}` : ""}
                </span>
            ) : null}
        </div>
    );
});

const PasswordInput = forwardRef<HTMLInputElement, InputProps>(function PasswordInput(props, ref) {
    return <InputBase ref={ref} {...props} type="password" />;
});

export const Input = Object.assign(InputBase, { TextArea, Password: PasswordInput });

export function InputNumber({
    value,
    defaultValue,
    onChange,
    min,
    max,
    step = 1,
    precision,
    className,
    ...props
}: Omit<React.ComponentProps<"input">, "value" | "defaultValue" | "onChange" | "min" | "max" | "step"> & {
    value?: number | null;
    defaultValue?: number;
    onChange?: (value: number | null) => void;
    precision?: number;
    min?: number;
    max?: number;
    step?: number;
}) {
    return (
        <UiInput
            {...props}
            type="number"
            min={min}
            max={max}
            step={step}
            {...(value === undefined ? { defaultValue } : { value: value ?? "" })}
            onChange={(event) => onChange?.(event.target.value === "" ? null : Number(event.target.value))}
            className={cn("h-8 px-3 text-sm", className)}
        />
    );
}

export type SelectOption<T = string | number> = { value: T; label: ReactNode; disabled?: boolean };
type SelectProps<T = string | number> = {
    value?: T | T[] | null;
    defaultValue?: T | T[];
    options?: SelectOption<T>[];
    onChange?: (value: T | T[] | undefined) => void;
    onValueChange?: (value: string) => void;
    onOpenChange?: (open: boolean) => void;
    open?: boolean;
    disabled?: boolean;
    placeholder?: string;
    className?: string;
    id?: string;
    size?: "small" | "middle" | "large";
    mode?: "multiple" | "tags";
    tokenSeparators?: string[];
    allowClear?: boolean;
    variant?: "outlined" | "borderless";
    children?: ReactNode;
    "aria-invalid"?: boolean;
    "aria-required"?: boolean;
    "aria-describedby"?: string;
    "aria-labelledby"?: string;
};

function SelectOption({ children }: { value: string; children?: ReactNode }) {
    return <>{children}</>;
}

function SelectBase<T extends string | number = string>({
    value,
    defaultValue,
    options = [],
    onChange,
    onValueChange,
    open,
    onOpenChange,
    disabled,
    placeholder,
    className,
    id,
    size = "middle",
    mode,
    tokenSeparators = [","],
    allowClear,
    variant,
    ["aria-invalid"]: ariaInvalid,
    ["aria-required"]: ariaRequired,
    ["aria-describedby"]: ariaDescribedBy,
    ["aria-labelledby"]: ariaLabelledBy,
}: SelectProps<T>) {
    const [search, setSearch] = useState("");
    const selected = Array.isArray(value) ? value : value == null ? [] : [value];
    const selectedText = selected.map(String).join(", ");
    const filtered = options.filter((option) => !search || String(option.label).toLowerCase().includes(search.toLowerCase()) || String(option.value).toLowerCase().includes(search.toLowerCase()));

    if (mode === "tags" || mode === "multiple") {
        const inputValue = selectedText;
        return (
            <InputBase
                value={inputValue}
                disabled={disabled}
                placeholder={placeholder}
                className={cn(size === "small" && "h-7", className)}
                id={id}
                aria-invalid={ariaInvalid}
                aria-required={ariaRequired}
                aria-describedby={ariaDescribedBy}
                aria-labelledby={ariaLabelledBy}
                onChange={(event) => {
                    const next = event.target.value
                        .split(new RegExp(tokenSeparators.map((separator) => separator.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")))
                        .map((item) => item.trim())
                        .filter(Boolean) as T[];
                    onChange?.(next);
                }}
            />
        );
    }

    const selectedOption = options.find((option) => String(option.value) === String(value ?? defaultValue ?? ""));
    const valueString = value == null ? undefined : String(value);

    return (
        <UiSelect
            value={allowClear && valueString === "" ? undefined : valueString}
            defaultValue={defaultValue == null ? undefined : String(defaultValue)}
            open={open}
            onOpenChange={onOpenChange}
            onValueChange={(next) => {
                const selectedOption = options.find((option) => String(option.value) === next);
                if (next === "__clear__") onChange?.(undefined);
                else onChange?.((selectedOption?.value ?? next) as T);
                onValueChange?.(next);
            }}
            disabled={disabled}
        >
            <SelectTrigger id={id} aria-invalid={ariaInvalid} aria-required={ariaRequired} aria-describedby={ariaDescribedBy} aria-labelledby={ariaLabelledBy} className={cn(size === "small" && "h-7 text-xs", variant === "borderless" && "border-transparent bg-transparent shadow-none", className)}>
                <SelectValue placeholder={selectedOption ? undefined : placeholder}>{selectedOption?.label}</SelectValue>
            </SelectTrigger>
            <SelectContent>
                {allowClear ? <SelectItem value="__clear__">清除选择</SelectItem> : null}
                {options.length
                    ? filtered.map((option) => (
                          <SelectItem key={String(option.value)} value={String(option.value)} disabled={option.disabled}>
                              {option.label}
                          </SelectItem>
                      ))
                    : null}
            </SelectContent>
        </UiSelect>
    );
}

export const Select = Object.assign(SelectBase, { Option: SelectOption });

export function Slider({
    value,
    defaultValue,
    onChange,
    range,
    className,
    ...props
}: Omit<React.ComponentProps<typeof UiSlider>, "value" | "defaultValue" | "onValueChange"> & { value?: number | number[]; defaultValue?: number | number[]; onChange?: (value: number | number[]) => void; range?: boolean }) {
    const values = value === undefined ? undefined : Array.isArray(value) ? value : [value];
    const defaults = defaultValue === undefined ? undefined : Array.isArray(defaultValue) ? defaultValue : [defaultValue];
    return <UiSlider {...props} className={className} value={values} defaultValue={defaults} onValueChange={(next) => onChange?.(range || Array.isArray(value) ? next : next[0])} />;
}

type SwitchProps = React.ComponentProps<typeof UiSwitch> & { checked?: boolean; defaultChecked?: boolean; onChange?: (checked: boolean) => void; size?: "small" | "default" };

export function Switch({ checked, defaultChecked, onChange, size, className, ...props }: SwitchProps) {
    return <UiSwitch checked={checked} defaultChecked={defaultChecked} onCheckedChange={onChange} className={cn(size === "small" && "h-4 w-7 [&_[data-slot=switch-thumb]]:size-3", className)} {...props} />;
}

type CheckboxProps = React.ComponentProps<typeof UiCheckbox> & { checked?: boolean; defaultChecked?: boolean; indeterminate?: boolean; onChange?: (event: { target: { checked: boolean } }) => void };

export function Checkbox({ checked, defaultChecked, indeterminate, onChange, ...props }: CheckboxProps) {
    return <UiCheckbox checked={indeterminate ? "indeterminate" : checked} defaultChecked={defaultChecked} onCheckedChange={(value) => onChange?.({ target: { checked: value === true } })} {...props} />;
}

type SegmentedOption = string | number | { value: string | number; label?: ReactNode; disabled?: boolean };

export function Segmented({
    options = [],
    value,
    defaultValue,
    onChange,
    size,
    block,
    className,
    ...props
}: {
    options?: SegmentedOption[];
    value?: string | number;
    defaultValue?: string | number;
    onChange?: (value: string | number) => void;
    size?: "small" | "default";
    block?: boolean;
    className?: string;
    [key: string]: any;
}) {
    const [internalValue, setInternalValue] = useState(defaultValue === undefined ? "" : String(defaultValue));
    return (
        <UiToggleGroup
            type="single"
            variant="outline"
            size={size === "small" ? "sm" : "default"}
            spacing={0}
            value={value === undefined ? internalValue : String(value)}
            aria-label={props["aria-label"] || "选择一个选项"}
            className={cn("min-w-0", block && "w-full [&>[data-slot=toggle-group-item]]:flex-1", className)}
            onValueChange={(next) => {
                if (next === "") return;
                if (value === undefined) setInternalValue(next);
                const selected = options.find((item) => String(typeof item === "object" ? item.value : item) === next);
                if (selected !== undefined) onChange?.(typeof selected === "object" ? selected.value : selected);
            }}
            {...props}
        >
            {options.map((item) => {
                const option = typeof item === "object" ? item : { value: item, label: item };
                return (
                    <ToggleGroupItem key={String(option.value)} value={String(option.value)} disabled={option.disabled} className="min-w-0 flex-1">
                        {option.label ?? option.value}
                    </ToggleGroupItem>
                );
            })}
        </UiToggleGroup>
    );
}

type ModalProps = ChildrenProps & {
    open?: boolean;
    title?: ReactNode;
    footer?: ReactNode;
    width?: number | string;
    closable?: boolean;
    onCancel?: () => void;
    onOk?: () => void;
    okText?: string;
    cancelText?: string;
    okButtonProps?: { danger?: boolean; disabled?: boolean };
    destroyOnHidden?: boolean;
    centered?: boolean;
    styles?: { body?: CSSProperties; content?: CSSProperties };
};

export function Modal({ open = false, title, footer, width, closable, onCancel, onOk, okText = "确定", cancelText = "取消", okButtonProps, children, className, styles }: ModalProps) {
    const style = { ...(width ? { width: typeof width === "number" ? `${width}px` : width, maxWidth: "calc(100vw - 2rem)" } : {}), ...styles?.content };
    return (
        <Dialog open={open} onOpenChange={(next) => !next && onCancel?.()}>
            <DialogContent showCloseButton={closable !== false} className={cn("max-h-[90dvh] overflow-y-auto", className)} style={style}>
                <DialogHeader>{title ? <DialogTitle>{title}</DialogTitle> : <DialogTitle className="sr-only">对话框</DialogTitle>}</DialogHeader>
                <div style={styles?.body}>{children}</div>
                {footer === null
                    ? null
                    : (footer ??
                      (onOk || onCancel ? (
                          <DialogFooter>
                              {onCancel ? (
                                  <Button variant="outline" onClick={onCancel}>
                                      {cancelText}
                                  </Button>
                              ) : null}
                              {onOk ? (
                                  <Button danger={okButtonProps?.danger} disabled={okButtonProps?.disabled} onClick={onOk}>
                                      {okText}
                                  </Button>
                              ) : null}
                          </DialogFooter>
                      ) : null))}
            </DialogContent>
        </Dialog>
    );
}

type DrawerProps = ChildrenProps & {
    open?: boolean;
    title?: ReactNode;
    placement?: "left" | "right" | "top" | "bottom";
    size?: number | "default" | "large";
    width?: number | string;
    height?: number | string;
    onClose?: () => void;
    footer?: ReactNode;
    extra?: ReactNode;
};

export function Drawer({ open = false, title, placement = "right", size = "default", width, height, onClose, footer, extra, children, className }: DrawerProps) {
    const side = placement;
    const dimension = side === "left" || side === "right" ? (width ?? size) : (height ?? (size === "large" ? "80vh" : "50vh"));
    const style =
        typeof dimension === "number"
            ? side === "left" || side === "right"
                ? { width: `${dimension}px` }
                : { height: `${dimension}px` }
            : typeof dimension === "string" && dimension !== "default" && dimension !== "large"
              ? side === "left" || side === "right"
                  ? { width: dimension }
                  : { height: dimension }
              : undefined;
    return (
        <Sheet open={open} onOpenChange={(next) => !next && onClose?.()}>
            <SheetContent side={side} className={cn("flex min-h-0 flex-col", className)} style={style}>
                <SheetHeader className="flex-row items-center justify-between">
                    <div>
                        {title ? <SheetTitle>{title}</SheetTitle> : <SheetTitle className="sr-only">面板</SheetTitle>}
                        <SheetDescription className="sr-only">侧边面板</SheetDescription>
                    </div>
                    {extra}
                </SheetHeader>
                <div className="min-h-0 flex-1 overflow-auto">{children}</div>
                {footer ? <SheetFooter>{footer}</SheetFooter> : null}
            </SheetContent>
        </Sheet>
    );
}

export function Tooltip({
    title,
    placement = "top",
    children,
    open,
    onOpenChange,
    mouseEnterDelay: _mouseEnterDelay,
    color,
    styles,
    className,
    style,
}: ChildrenProps & { title?: ReactNode; placement?: string; open?: boolean; onOpenChange?: (open: boolean) => void; mouseEnterDelay?: number; color?: string; styles?: { root?: CSSProperties }; [key: string]: any }) {
    if (!title) return <>{children}</>;
    const side = placement.startsWith("bottom") ? "bottom" : placement.startsWith("left") ? "left" : placement.startsWith("right") ? "right" : "top";
    const trigger = React.isValidElement(children) ? (children as ReactElement) : <span>{children}</span>;
    return (
        <UiTooltip open={open} onOpenChange={onOpenChange}>
            <TooltipTrigger asChild>{trigger}</TooltipTrigger>
            <TooltipContent side={side} className={className} style={{ backgroundColor: color, ...styles?.root, ...style }}>
                {title}
            </TooltipContent>
        </UiTooltip>
    );
}

export function Popover({
    content,
    title,
    placement = "bottom",
    trigger = "click",
    open,
    onOpenChange,
    children,
    className,
    mouseEnterDelay: _mouseEnterDelay,
}: ChildrenProps & { content?: ReactNode; title?: ReactNode; placement?: string; trigger?: string | string[]; open?: boolean; onOpenChange?: (open: boolean) => void; mouseEnterDelay?: number; [key: string]: any }) {
    const side = placement.startsWith("top") ? "top" : placement.startsWith("left") ? "left" : placement.startsWith("right") ? "right" : "bottom";
    const triggerNode = React.isValidElement(children) ? (children as ReactElement) : <span>{children}</span>;
    if (Array.isArray(trigger) && trigger.includes("hover"))
        return (
            <UiTooltip>
                <TooltipTrigger asChild>{triggerNode}</TooltipTrigger>
                <TooltipContent side={side}>
                    {title ? <div className="mb-1 font-medium">{title}</div> : null}
                    {content}
                </TooltipContent>
            </UiTooltip>
        );
    return (
        <UiPopover open={open} onOpenChange={onOpenChange}>
            <PopoverTrigger asChild>{triggerNode}</PopoverTrigger>
            <PopoverContent side={side} className={className}>
                {title ? <div className="mb-2 font-medium">{title}</div> : null}
                {content}
            </PopoverContent>
        </UiPopover>
    );
}

export type MenuItem = { key: string; label?: ReactNode; icon?: ReactNode; disabled?: boolean; danger?: boolean; type?: "divider"; onClick?: () => void; children?: MenuItem[] };
export type MenuProps = { items?: MenuItem[]; onClick?: (info: { key: string }) => void };

export function Dropdown({
    menu,
    children,
    open,
    onOpenChange,
    disabled,
    placement = "bottomRight",
    className,
    trigger: _trigger,
}: ChildrenProps & { menu?: MenuProps; open?: boolean; onOpenChange?: (open: boolean) => void; disabled?: boolean; placement?: string; trigger?: string | string[] }) {
    const trigger = React.isValidElement(children) ? (children as ReactElement) : <button type="button">{children}</button>;
    const align = placement.toLowerCase().includes("right") ? "end" : "start";
    return (
        <DropdownMenu open={open} onOpenChange={onOpenChange}>
            <DropdownMenuTrigger asChild disabled={disabled}>
                {trigger}
            </DropdownMenuTrigger>
            <DropdownMenuContent align={align} className={className}>
                {menu?.items?.map((item) =>
                    item.type === "divider" ? (
                        <DropdownMenuSeparator key={item.key} />
                    ) : (
                        <DropdownMenuItem
                            key={item.key}
                            disabled={item.disabled}
                            variant={item.danger ? "destructive" : "default"}
                            onSelect={() => {
                                item.onClick?.();
                                menu.onClick?.({ key: item.key });
                            }}
                        >
                            {item.icon}
                            {item.label}
                        </DropdownMenuItem>
                    ),
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

function TagBase({ children, className, color, variant, closable, onClose, ...props }: ChildrenProps & { color?: string; variant?: string; closable?: boolean; onClose?: () => void; [key: string]: any }) {
    const colors: Record<string, string> = {
        green: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
        blue: "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300",
        red: "border-destructive/30 bg-destructive/10 text-destructive",
        processing: "border-primary/30 bg-primary/10 text-primary",
    };
    return (
        <Badge variant={variant === "filled" ? "secondary" : "outline"} className={cn("rounded-md font-normal", color && colors[color], className)} {...props}>
            {children}
            {closable ? (
                <button type="button" onClick={onClose} className="ml-1">
                    <X className="size-3" />
                </button>
            ) : null}
        </Badge>
    );
}

function CheckableTag({ checked, onChange, children, className, ...props }: ChildrenProps & { checked?: boolean; onChange?: (checked: boolean) => void; [key: string]: any }) {
    return (
        <button
            type="button"
            aria-pressed={checked}
            onClick={() => onChange?.(!checked)}
            className={cn(
                "inline-flex items-center rounded-md border px-2 py-1 text-xs transition",
                checked ? "border-primary bg-primary text-primary-foreground" : "border-border bg-transparent text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                className,
            )}
            {...props}
        >
            {children}
        </button>
    );
}

export const Tag = Object.assign(TagBase, { CheckableTag });

export function Card({ children, className, style, title, size: _size, ...props }: ChildrenProps & { title?: ReactNode; size?: "small" | "default"; [key: string]: any }) {
    return (
        <UiCard className={className} style={style} {...props}>
            {title ? (
                <CardHeader>
                    <CardTitle>{title}</CardTitle>
                </CardHeader>
            ) : null}
            <CardContent className={title ? undefined : "p-0"}>{children}</CardContent>
        </UiCard>
    );
}

function EmptyBase({ description, className, image }: ChildrenProps & { description?: ReactNode; image?: ReactNode }) {
    return (
        <div className={cn("flex flex-col items-center justify-center gap-3 text-center text-sm text-muted-foreground", className)}>
            {image === Empty.PRESENTED_IMAGE_SIMPLE ? <ImageIcon className="size-8 opacity-40" /> : image || <ImageIcon className="size-8 opacity-40" />}
            {description}
        </div>
    );
}
export const Empty = Object.assign(EmptyBase, { PRESENTED_IMAGE_SIMPLE: "simple" });

function SpaceBase({
    children,
    size = 8,
    wrap,
    direction = "horizontal",
    className,
    style,
    ...props
}: ChildrenProps & { size?: number | [number, number] | "small" | "middle" | "large"; wrap?: boolean; direction?: "horizontal" | "vertical"; [key: string]: any }) {
    const gaps = typeof size === "number" ? `${size}px` : Array.isArray(size) ? `${size[1]}px ${size[0]}px` : size === "small" ? "4px" : size === "large" ? "16px" : "8px";
    return (
        <div className={cn("flex items-center", direction === "vertical" && "flex-col items-stretch", wrap && "flex-wrap", className)} style={{ gap: gaps, ...style }} {...props}>
            {children}
        </div>
    );
}
export const Space = Object.assign(SpaceBase, {
    Compact: function Compact({ children, className, ...props }: ChildrenProps & Record<string, any>) {
        return (
            <div className={cn("flex [&>*:not(:first-child)]:rounded-l-none [&>*:not(:last-child)]:rounded-r-none", className)} {...props}>
                {children}
            </div>
        );
    },
});

type FormValues = Record<string, any>;
type FormRule = { required?: boolean; max?: number; min?: number; pattern?: RegExp; message?: string; validator?: (_rule: unknown, value: unknown) => Promise<void> };
type FormFieldError = { name: string | string[]; errors: string[] };
type FormInstance<T extends FormValues = FormValues> = {
    getFieldValue: (name: string) => unknown;
    setFieldValue: (name: string, value: unknown) => void;
    setFieldsValue: (values: Partial<T>) => void;
    validateFields: () => Promise<T>;
    resetFields: () => void;
    setFields: (fields: FormFieldError[]) => void;
    getFieldsError: () => FormFieldError[];
    scrollToField: (name: string | string[], options?: ScrollIntoViewOptions) => void;
    subscribe: (listener: () => void) => () => void;
    getSnapshot: () => number;
    getErrors: (name: string) => string[];
};

function createFormInstance<T extends FormValues>(): FormInstance<T> {
    let values: T = {} as T;
    let errors: FormFieldError[] = [];
    let version = 0;
    const listeners = new Set<() => void>();
    const notify = () => {
        version += 1;
        listeners.forEach((listener) => listener());
    };
    const subscribe = (listener: () => void) => {
        listeners.add(listener);
        return () => listeners.delete(listener);
    };
    return {
        getFieldValue: (name) => values[name],
        setFieldValue: (name, value) => {
            values = { ...values, [name]: value };
            errors = errors.filter((item) => item.name !== name);
            notify();
        },
        setFieldsValue: (next) => {
            values = { ...values, ...next };
            notify();
        },
        validateFields: async () => {
            notify();
            return values;
        },
        resetFields: () => {
            values = {} as T;
            errors = [];
            notify();
        },
        setFields: (fields) => {
            errors = fields;
            notify();
        },
        getFieldsError: () => errors,
        scrollToField: (name) => document.querySelector(`[name="${Array.isArray(name) ? name.join(".") : name}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" }),
        subscribe,
        getSnapshot: () => version,
        getErrors: (name) => errors.find((item) => item.name === name)?.errors || [],
    };
}

const FormContext = createContext<FormInstance | null>(null);

function FormRoot({
    children,
    form,
    initialValues,
    onFinish,
    className,
    layout,
    requiredMark: _requiredMark,
    preserve: _preserve,
    ...props
}: ChildrenProps & { form?: FormInstance; initialValues?: FormValues; onFinish?: (values: FormValues) => void; layout?: "horizontal" | "vertical"; [key: string]: any }) {
    const [localForm] = React.useState(() => createFormInstance());
    const instance = form || localForm;
    useEffect(() => {
        if (initialValues) instance.setFieldsValue(initialValues);
    }, [initialValues, instance]);
    return (
        <FormContext.Provider value={instance}>
            <form
                className={cn("flex flex-col gap-4", layout === "horizontal" && "md:flex-row md:items-center", className)}
                onSubmit={(event) => {
                    event.preventDefault();
                    void instance.validateFields().then((values) => onFinish?.(values));
                }}
                {...props}
            >
                <FieldGroup className="gap-4">{children}</FieldGroup>
            </form>
        </FormContext.Provider>
    );
}

function FormItem({ name, label, extra, rules = [], required, children, className, id: providedId, ...props }: ChildrenProps & { name?: string; label?: ReactNode; extra?: ReactNode; rules?: FormRule[]; required?: boolean; id?: string; [key: string]: any }) {
    const generatedId = React.useId();
    const id = providedId || generatedId;
    const form = useContext(FormContext);
    const getSnapshot = () => form?.getSnapshot() ?? 0;
    useSyncExternalStore(form?.subscribe || (() => () => {}), getSnapshot, getSnapshot);
    const value = name ? form?.getFieldValue(name) : undefined;
    const error = name ? form?.getErrors(name)[0] : undefined;
    const child = React.Children.only(children) as ReactElement<any>;
    const isRequired = required || rules.some((rule) => rule.required);
    const labelId = label ? `${id}-label` : undefined;
    const descriptionId = extra ? `${id}-description` : undefined;
    const errorId = error ? `${id}-error` : undefined;
    const describedBy = [descriptionId, errorId].filter(Boolean).join(" ") || undefined;
    const control = React.cloneElement(child, {
        id,
        ...(name
            ? {
                  name,
                  value: value ?? (child.type === Input.TextArea ? "" : undefined),
                  onChange: (eventOrValue: any) => {
                      const nextValue = eventOrValue?.target ? eventOrValue.target.value : eventOrValue;
                      form?.setFieldValue(name, nextValue);
                      child.props.onChange?.(eventOrValue);
                  },
              }
            : {}),
        "aria-invalid": Boolean(error),
        "aria-required": isRequired,
        "aria-describedby": describedBy,
        "aria-labelledby": labelId,
    });
    const validate = async () => {
        if (!name || !form) return;
        const current = form.getFieldValue(name);
        let message = "";
        for (const rule of rules) {
            const text = String(current ?? "");
            if (rule.required && !text.trim()) message = rule.message || "此项为必填项";
            else if (rule.max !== undefined && text.length > rule.max) message = rule.message || `最多输入 ${rule.max} 个字符`;
            else if (rule.min !== undefined && text.length < rule.min) message = rule.message || `至少输入 ${rule.min} 个字符`;
            else if (rule.pattern && !rule.pattern.test(text)) message = rule.message || "格式不正确";
            else if (rule.validator) {
                try {
                    await rule.validator(rule, current);
                } catch (caught) {
                    message = caught instanceof Error ? caught.message : rule.message || "内容无效";
                }
            }
            if (message) break;
        }
        if (message) form.setFields([{ name, errors: [message] }]);
        else form.setFields([{ name, errors: [] }]);
        if (message) throw new Error(message);
    };
    useEffect(() => {
        if (name && form && rules.length) void validate();
    }, [name, form, rules, value]);

    return (
        <Field id={id} data-invalid={Boolean(error)} className={cn("min-w-0 gap-1.5", className)} {...props}>
            {label ? (
                <FieldLabel id={labelId} htmlFor={id} className="text-sm font-medium text-foreground">
                    {label}
                    {isRequired ? <span className="ml-1 text-destructive">*</span> : null}
                </FieldLabel>
            ) : null}
            {control}
            {extra ? <FieldDescription id={descriptionId} className="text-xs">{extra}</FieldDescription> : null}
            {error ? <FieldError id={errorId} className="text-xs">{error}</FieldError> : null}
        </Field>
    );
}

function useForm<T extends FormValues = FormValues>() {
    const [form] = React.useState(() => createFormInstance<T>());
    return [form] as const;
}

function useWatch(name: string, form: FormInstance) {
    useSyncExternalStore(form.subscribe, form.getSnapshot, form.getSnapshot);
    return form.getFieldValue(name);
}

export const Form = Object.assign(FormRoot, { Item: FormItem, useForm, useWatch });

export function Pagination({
    current = 1,
    pageSize = 10,
    total = 0,
    onChange,
    size,
    className,
    showSizeChanger,
    ...props
}: {
    current?: number;
    pageSize?: number;
    total?: number;
    onChange?: (page: number, pageSize: number) => void;
    size?: string;
    className?: string;
    showSizeChanger?: boolean;
    [key: string]: any;
}) {
    const pages = Math.max(1, Math.ceil(total / pageSize));
    return (
        <nav className={cn("flex items-center justify-center gap-2 text-sm", className)} aria-label="分页" {...props}>
            <Button variant="outline" size="sm" disabled={current <= 1} onClick={() => onChange?.(current - 1, pageSize)} aria-label="上一页">
                <ChevronLeft className="size-4" />
            </Button>
            <span className="min-w-20 text-center text-muted-foreground">
                {current} / {pages}
            </span>
            <Button variant="outline" size="sm" disabled={current >= pages} onClick={() => onChange?.(current + 1, pageSize)} aria-label="下一页">
                <ChevronRight className="size-4" />
            </Button>
        </nav>
    );
}

export function Progress({ percent = 0, status, showInfo = true, className, size, ...props }: { percent?: number; status?: string; showInfo?: boolean; className?: string; size?: string | number; [key: string]: any }) {
    return (
        <div className={cn("flex items-center gap-2", className)} {...props}>
            <UiProgress value={percent} className={cn("h-2 flex-1", status === "exception" && "[&>div]:bg-destructive")} />
            {showInfo ? <span className="text-xs text-muted-foreground">{Math.round(percent)}%</span> : null}
        </div>
    );
}

export function Spin({ size, className, spinning = true, tip, children }: { size?: "small" | "default" | "large"; className?: string; spinning?: boolean; tip?: ReactNode; children?: ReactNode }) {
    const indicator = spinning ? (
        <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Spinner className={cn(size === "small" && "size-3", size === "large" && "size-6", className)} />
            {tip ? <span className="text-sm">{tip}</span> : null}
        </div>
    ) : null;
    return children ? (
        <div className="relative">
            {children}
            {indicator ? <div className="absolute inset-0 grid place-items-center bg-background/60">{indicator}</div> : null}
        </div>
    ) : (
        indicator
    );
}

export function Alert({ message, description, type = "info", className, showIcon: _showIcon, ...props }: { message?: ReactNode; description?: ReactNode; type?: string; className?: string; showIcon?: boolean; [key: string]: any }) {
    return (
        <UiAlert className={cn(type === "warning" && "border-amber-500/30 text-amber-700 dark:text-amber-300", (type === "error" || type === "danger") && "border-destructive/30 text-destructive", className)} {...props}>
            <AlertCircle className="size-4" />
            <div>
                {message ? <AlertTitle>{message}</AlertTitle> : null}
                {description ? <AlertDescription>{description}</AlertDescription> : null}
            </div>
        </UiAlert>
    );
}

type TabItem = { key: string; label: ReactNode; children?: ReactNode; disabled?: boolean };

export function Tabs({
    items = [],
    activeKey,
    defaultActiveKey,
    onChange,
    className,
    tabBarExtraContent,
    ...props
}: {
    items?: TabItem[];
    activeKey?: string;
    defaultActiveKey?: string;
    onChange?: (key: string) => void;
    className?: string;
    tabBarExtraContent?: ReactNode;
    [key: string]: any;
}) {
    const [value, setValue] = useState(defaultActiveKey || activeKey || items[0]?.key || "");
    const active = activeKey ?? value;
    return (
        <UiTabs
            value={active}
            onValueChange={(next) => {
                setValue(next);
                onChange?.(next);
            }}
            className={className}
            {...props}
        >
            <div className="flex items-center justify-between gap-3">
                <TabsList>
                    {items.map((item) => (
                        <TabsTrigger key={item.key} value={item.key} disabled={item.disabled}>
                            {item.label}
                        </TabsTrigger>
                    ))}
                </TabsList>
                {tabBarExtraContent}
            </div>
            {items.map((item) => (
                <TabsContent key={item.key} value={item.key}>
                    {item.children}
                </TabsContent>
            ))}
        </UiTabs>
    );
}

export function Collapse({
    items = [],
    activeKey,
    defaultActiveKey,
    onChange,
    className,
}: {
    items?: Array<{ key: string; label: ReactNode; children?: ReactNode }>;
    activeKey?: string | string[];
    defaultActiveKey?: string | string[];
    onChange?: (key: string | string[]) => void;
    className?: string;
}) {
    const [uncontrolled, setUncontrolled] = useState<string[]>(() => {
        const initial = defaultActiveKey ?? "";
        return Array.isArray(initial) ? initial : [initial];
    });
    const selected = activeKey === undefined ? uncontrolled : Array.isArray(activeKey) ? activeKey : [activeKey];
    const update = (key: string, open: boolean) => {
        const next = open ? [...selected, key] : selected.filter((item) => item !== key);
        if (activeKey === undefined) setUncontrolled(next);
        onChange?.(next);
    };
    return (
        <div className={cn("flex flex-col gap-2", className)}>
            {items.map((item) => (
                <Collapsible key={item.key} open={selected.includes(item.key)} onOpenChange={(open) => update(item.key, open)}>
                    <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border px-3 py-2 text-sm font-medium">
                        {item.label}
                        <ChevronDown className="size-4" />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pt-3">{item.children}</CollapsibleContent>
                </Collapsible>
            ))}
        </div>
    );
}

type TableColumn<T> = { title?: ReactNode; dataIndex?: keyof T | string; key?: string; width?: number | string; render?: (value: unknown, record: T, index: number) => ReactNode; align?: "left" | "center" | "right" };

export function Table<T extends Record<string, any>>({
    dataSource = [],
    columns = [],
    rowKey = "key",
    pagination = false,
    locale,
    className,
}: {
    dataSource?: T[];
    columns?: TableColumn<T>[];
    rowKey?: keyof T | ((record: T) => string);
    pagination?: false | { pageSize?: number };
    locale?: { emptyText?: ReactNode };
    className?: string;
}) {
    const pageSize = pagination && pagination.pageSize ? pagination.pageSize : dataSource.length;
    const rows = dataSource.slice(0, pageSize || undefined);
    return (
        <div className={cn("overflow-x-auto rounded-lg border", className)}>
            <table className="w-full text-left text-sm">
                <thead className="bg-muted/60 text-xs text-muted-foreground">
                    <tr>
                        {columns.map((column, index) => (
                            <th key={column.key || String(column.dataIndex || index)} style={{ width: column.width }} className="px-3 py-2 font-medium">
                                {column.title}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {rows.map((record, rowIndex) => (
                        <tr key={typeof rowKey === "function" ? rowKey(record) : String(record[rowKey] ?? rowIndex)} className="border-t">
                            {columns.map((column, index) => {
                                const value = column.dataIndex ? record[column.dataIndex as keyof T] : undefined;
                                return (
                                    <td key={column.key || String(column.dataIndex || index)} className="px-3 py-2 align-top">
                                        {column.render ? column.render(value, record, rowIndex) : String(value ?? "")}
                                    </td>
                                );
                            })}
                        </tr>
                    ))}
                </tbody>
            </table>
            {!rows.length ? <div className="p-6">{locale?.emptyText || <Empty description="暂无数据" />}</div> : null}
        </div>
    );
}

export function Timeline({ items = [], className }: { items?: Array<{ color?: string; children?: ReactNode; label?: ReactNode }>; className?: string }) {
    return (
        <ol className={cn("flex flex-col", className)}>
            {items.map((item, index) => (
                <li key={index} className="relative border-l border-border pb-5 pl-4 last:border-transparent">
                    <span className={cn("absolute -left-1.5 top-1 size-3 rounded-full border-2 border-background bg-primary", item.color === "gray" && "bg-muted-foreground")} />
                    {item.label ? <div className="mb-1 text-xs text-muted-foreground">{item.label}</div> : null}
                    <div>{item.children}</div>
                </li>
            ))}
        </ol>
    );
}

export function Popconfirm({
    title,
    description,
    okText = "确定",
    cancelText = "取消",
    onConfirm,
    onCancel,
    children,
    disabled,
}: ChildrenProps & { title?: ReactNode; description?: ReactNode; okText?: string; cancelText?: string; onConfirm?: () => void; onCancel?: () => void; disabled?: boolean }) {
    const [open, setOpen] = useState(false);
    return (
        <Popover
            open={open}
            onOpenChange={setOpen}
            content={
                <div className="flex flex-col gap-3">
                    <div className="font-medium">{title}</div>
                    {description ? <div className="text-sm text-muted-foreground">{description}</div> : null}
                    <div className="flex justify-end gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                                setOpen(false);
                                onCancel?.();
                            }}
                        >
                            {cancelText}
                        </Button>
                        <Button
                            size="sm"
                            disabled={disabled}
                            onClick={() => {
                                onConfirm?.();
                                setOpen(false);
                            }}
                        >
                            {okText}
                        </Button>
                    </div>
                </div>
            }
        >
            {children}
        </Popover>
    );
}

function ImageBase({
    src,
    alt,
    className,
    style,
    preview,
    onClick,
    ...props
}: {
    src?: string;
    alt?: string;
    className?: string;
    style?: CSSProperties;
    preview?: boolean | { visible?: boolean; open?: boolean; src?: string; onVisibleChange?: (open: boolean) => void; onOpenChange?: (open: boolean) => void };
    onClick?: React.MouseEventHandler<HTMLImageElement>;
    [key: string]: any;
}) {
    const [localOpen, setLocalOpen] = useState(false);
    const visible = typeof preview === "object" ? (preview.visible ?? preview.open ?? localOpen) : localOpen;
    const previewSrc = typeof preview === "object" ? preview.src || src : src;
    const setVisible = (open: boolean) => {
        if (typeof preview === "object") (preview.onVisibleChange || preview.onOpenChange)?.(open);
        else setLocalOpen(open);
    };
    return (
        <>
            <img
                src={src}
                alt={alt || ""}
                className={cn(className, preview && "cursor-zoom-in")}
                style={style}
                {...props}
                onClick={(event) => {
                    onClick?.(event);
                    if (preview) setVisible(true);
                }}
            />
            <Dialog open={Boolean(preview && visible)} onOpenChange={setVisible}>
                <DialogContent className="flex h-[90dvh] max-w-[95vw] items-center justify-center border-0 bg-transparent p-0 shadow-none">
                    <DialogTitle className="sr-only">{alt || "图片预览"}</DialogTitle>
                    <DialogDescription className="sr-only">图片预览</DialogDescription>
                    <img src={previewSrc} alt={alt || ""} className="max-h-full max-w-full object-contain" />
                </DialogContent>
            </Dialog>
        </>
    );
}

function PreviewGroup({ preview, children }: { preview?: { open?: boolean; visible?: boolean; current?: number; onOpenChange?: (open: boolean) => void; onChange?: (index: number) => void }; children?: ReactNode }) {
    const images = React.Children.toArray(children).flatMap((child) => (React.isValidElement(child) ? [{ src: (child.props as { src?: string }).src, alt: (child.props as { alt?: string }).alt }] : []));
    const visible = preview?.open ?? preview?.visible ?? false;
    const current = preview?.current ?? 0;
    const active = images[current];
    const change = (index: number) => preview?.onChange?.(index);
    return (
        <>
            {children}
            <Dialog open={visible} onOpenChange={(open) => preview?.onOpenChange?.(open)}>
                <DialogContent className="flex h-[90dvh] max-w-[95vw] items-center justify-center border-0 bg-transparent p-0 shadow-none">
                    <DialogTitle className="sr-only">{active?.alt || "图片预览"}</DialogTitle>
                    <DialogDescription className="sr-only">图片预览</DialogDescription>
                    <Button variant="ghost" size="icon" onClick={() => change((current + images.length - 1) % images.length)} aria-label="上一张">
                        <ChevronLeft />
                    </Button>
                    <img src={active?.src} alt={active?.alt || ""} className="max-h-full max-w-full object-contain" />
                    <Button variant="ghost" size="icon" onClick={() => change((current + 1) % images.length)} aria-label="下一张">
                        <ChevronRight />
                    </Button>
                </DialogContent>
            </Dialog>
        </>
    );
}
export const Image = Object.assign(ImageBase, { PreviewGroup });

const TypographyText = ({
    children,
    className,
    type,
    strong,
    code,
    mark,
    ellipsis,
    href,
    ...props
}: ChildrenProps & { type?: string; strong?: boolean; code?: boolean; mark?: boolean; ellipsis?: boolean | { rows?: number }; href?: string; [key: string]: any }) => {
    const TagName = href ? "a" : code ? "code" : mark ? "mark" : "span";
    return (
        <TagName
            href={href}
            className={cn(
                type === "secondary" && "text-muted-foreground",
                type === "danger" && "text-destructive",
                type === "success" && "text-emerald-600",
                strong && "font-semibold",
                ellipsis && (typeof ellipsis === "object" ? `line-clamp-${ellipsis.rows || 1}` : "truncate"),
                className,
            )}
            {...props}
        >
            {children}
        </TagName>
    );
};
const TypographyTitle = ({ children, level = 1, className, ...props }: ChildrenProps & { level?: number; [key: string]: any }) => {
    const TagName = `h${Math.min(6, Math.max(1, level))}` as keyof React.JSX.IntrinsicElements;
    return (
        <TagName className={cn("font-semibold", className)} {...props}>
            {children}
        </TagName>
    );
};
const TypographyParagraph = ({ children, className, ellipsis, type, ...props }: ChildrenProps & { ellipsis?: boolean | { rows?: number }; type?: string; [key: string]: any }) => (
    <p className={cn(type === "secondary" && "text-muted-foreground", ellipsis && (typeof ellipsis === "object" ? `line-clamp-${ellipsis.rows || 1}` : "truncate"), className)} {...props}>
        {children}
    </p>
);
export const Typography = Object.assign(() => null, { Text: TypographyText, Title: TypographyTitle, Paragraph: TypographyParagraph, Link: TypographyText });
