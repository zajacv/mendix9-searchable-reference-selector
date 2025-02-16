import {
    createElement,
    CSSProperties,
    Fragment,
    ReactElement,
    useEffect,
    useRef,
    useState,
    MouseEvent,
    useMemo
} from "react";
import Option from "./Option";
import { focusModeEnum } from "typings/general";
import {
    OptionsStyleSetEnum,
    OptionsStyleSingleEnum,
    SelectStyleEnum
} from "typings/SearchableReferenceSelectorMxNineProps";
import { IOption } from "typings/option";
import classNames from "classnames";

interface OptionMenuProps {
    options: IOption[];
    currentFocus: number;
    onSelect: (selectedOption: IOption) => void;
    onSelectMoreOptions: (() => void) | undefined;
    noResultsText: string;
    maxMenuHeight: string | undefined;
    moreResultsText: string | undefined;
    optionsStyle: OptionsStyleSetEnum | OptionsStyleSingleEnum;
    selectStyle: SelectStyleEnum;
    position?: DOMRect;
    hasMoreOptions: boolean;
    isLoading: boolean;
    allowLoadingSelect: boolean;
    loadingText: string;
}

const OptionsMenu = ({
    options,
    onSelect,
    optionsStyle,
    selectStyle,
    currentFocus,
    maxMenuHeight,
    moreResultsText,
    noResultsText,
    position,
    onSelectMoreOptions,
    hasMoreOptions,
    isLoading,
    loadingText,
    allowLoadingSelect
}: OptionMenuProps): ReactElement => {
    const selectedObjRef = useRef<HTMLLIElement>(null);
    const [focusMode, setFocusMode] = useState<focusModeEnum>(
        currentFocus !== undefined ? focusModeEnum.arrow : focusModeEnum.hover
    );

    const OptionMenuStyle = useMemo((): CSSProperties => {
        if (selectStyle === "dropdown" && position !== undefined) {
            const contentCloseToBottom = position.y > window.innerHeight * 0.7;
            return {
                maxHeight: maxMenuHeight ? maxMenuHeight : "15em",
                top: contentCloseToBottom ? "unset" : position.height + position.y,
                bottom: contentCloseToBottom ? window.innerHeight - position.y : "unset",
                width: position.width,
                left: position.x
            };
        } else {
            return {};
        }
    }, [position, maxMenuHeight, selectStyle]);

    // keep the selected item in view when using arrow keys
    useEffect(() => {
        if (selectedObjRef.current) {
            selectedObjRef.current.scrollIntoView({ block: "center" });
        }
        setFocusMode(focusModeEnum.arrow);
    }, [currentFocus]);

    return (
        <ul
            className={classNames(
                "srs-menu",
                { "srs-dropdown": selectStyle === "dropdown" },
                { "srs-list": selectStyle === "list" },
                { wait: isLoading && !allowLoadingSelect }
            )}
            style={OptionMenuStyle}
            onMouseMove={() => setFocusMode(focusModeEnum.hover)}
        >
            {options.length > 0 ? (
                <Fragment>
                    {isLoading && (
                        <li className="mx-text srs-infooption disabled" role="option">
                            {loadingText}
                        </li>
                    )}
                    {options.map((option, key) => (
                        <li key={key} ref={key === currentFocus ? selectedObjRef : undefined}>
                            <Option
                                index={key}
                                isFocused={key === currentFocus}
                                onSelect={selectedOption => {
                                    if (allowLoadingSelect || !isLoading) {
                                        onSelect(selectedOption);
                                    }
                                }}
                                focusMode={focusMode}
                                optionsStyle={optionsStyle}
                                option={option}
                            />
                        </li>
                    ))}
                    {hasMoreOptions && (
                        <li key={options.length} ref={currentFocus === options.length ? selectedObjRef : undefined}>
                            <div
                                role="option"
                                className={
                                    currentFocus === options.length ? "srs-option focused" : "mx-text srs-infooption"
                                }
                                style={{ cursor: onSelectMoreOptions ? "pointer" : "default" }}
                                onClick={(event: MouseEvent<HTMLDivElement>) => {
                                    if ((allowLoadingSelect || !isLoading) && onSelectMoreOptions !== undefined) {
                                        event.stopPropagation();
                                        onSelectMoreOptions();
                                    }
                                }}
                            >
                                {isLoading ? loadingText : moreResultsText}
                            </div>
                        </li>
                    )}
                </Fragment>
            ) : (
                <li className="mx-text srs-infooption disabled" role="option">
                    {isLoading ? loadingText : noResultsText ? noResultsText : "No results found"}
                </li>
            )}
        </ul>
    );
};

export default OptionsMenu;
