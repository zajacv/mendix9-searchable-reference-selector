import {
    createElement,
    useState,
    ReactElement,
    ChangeEvent,
    Fragment,
    KeyboardEvent,
    useCallback,
    useMemo,
    RefObject
} from "react";
import { WebIcon, ObjectItem } from "mendix";
import OptionsMenu from "./OptionMenu";
import useOnClickOutside from "../custom hooks/useOnClickOutside";
import { usePositionObserver } from "../custom hooks/usePositionObserver";
import SearchInput from "./SearchInput";
import MxIcon from "./MxIcon";
import { IOption } from "typings/option";
import {
    BadgeColorEnum,
    OptionsStyleSetEnum,
    OptionsStyleSingleEnum,
    ReferenceSetStyleEnum,
    SelectionTypeEnum,
    SelectStyleEnum
} from "typings/SearchableReferenceSelectorMxNineProps";
import CurrentValueDisplay from "./CurrentValueDisplay";
import classNames from "classnames";

const FOCUS_DELAY = 300;

interface SelectorProps {
    id: string;
    name: string;
    tabIndex?: number;
    placeholder: string | undefined;
    noResultsText: string;
    options: IOption[];
    currentValue: IOption | IOption[] | undefined;
    onSelect: (selectedOption: IOption | IOption[] | undefined) => void;
    mxFilter: string;
    setMxFilter: (newFilter: string) => void;
    isClearable: boolean;
    clearIcon: WebIcon | undefined;
    clearIconTitle: string;
    isSearchable: boolean;
    isReadOnly: boolean;
    selectionType: SelectionTypeEnum;
    selectStyle: SelectStyleEnum;
    showSelectAll: boolean; // selectionType = ReferenceSet
    selectAllIcon: WebIcon | undefined; // selectionType = ReferenceSet
    selectAllIconTitle: string; // selectionType = ReferenceSet
    dropdownIcon: WebIcon | undefined; // selectStyle = Dropdown
    maxMenuHeight: string; // selectStyle = Dropdown
    hasMoreOptions: boolean; // selectionType = Reference or ReferenceSet
    moreResultsText: string | undefined; // selectionType = Reference or ReferenceSet
    onSelectMoreOptions: (() => void) | undefined; // selectionType = Reference or ReferenceSet
    optionsStyle: OptionsStyleSetEnum | OptionsStyleSingleEnum;
    referenceSetStyle: ReferenceSetStyleEnum; // selectionType = ReferenceSet
    badgeColor: BadgeColorEnum; // selectionType = ReferenceSet && referenceSetStyle === badges
    isCompact: boolean; // selectionType = ReferenceSet
    maxReferenceDisplay: number; // selectionType = ReferenceSet
    onBadgeClick: ((selectedBadge: IOption) => void) | undefined; // selectionType = ReferenceSet
    srsRef?: RefObject<HTMLDivElement>;
    onLeave: () => void;
    isLoading: boolean;
    loadingText: string;
    allowLoadingSelect: boolean;
    clearSearchOnSelect: boolean;
}

const Selector = ({
    clearIcon,
    clearIconTitle,
    currentValue,
    dropdownIcon,
    hasMoreOptions,
    isClearable,
    isReadOnly,
    isSearchable,
    maxMenuHeight,
    maxReferenceDisplay,
    moreResultsText,
    id,
    name,
    noResultsText,
    onBadgeClick,
    onSelect,
    onSelectMoreOptions,
    options,
    optionsStyle,
    placeholder,
    referenceSetStyle,
    isCompact,
    selectAllIcon,
    selectAllIconTitle,
    mxFilter,
    setMxFilter,
    showSelectAll,
    tabIndex,
    selectStyle,
    selectionType,
    srsRef,
    onLeave,
    isLoading,
    loadingText,
    allowLoadingSelect,
    clearSearchOnSelect,
    badgeColor
}: SelectorProps): ReactElement => {
    const [showMenu, setShowMenu] = useState(false);
    const [focusedObjIndex, setFocusedObjIndex] = useState<number>(-1);
    const [searchInput, setSearchInput] = useState<HTMLInputElement | null>(null);

    // eslint-disable-next-line react-hooks/rules-of-hooks
    const position = srsRef && usePositionObserver(srsRef.current, selectStyle === "dropdown" && showMenu);

    const hasCurrentValue = useMemo(
        (): boolean =>
            selectionType !== "referenceSet"
                ? currentValue !== undefined
                : currentValue !== undefined && Array.isArray(currentValue) && currentValue.length > 0,
        [currentValue, selectionType]
    );

    const focusSearchInput = useCallback((): void => {
        if (searchInput !== null) {
            setTimeout(() => searchInput.focus(), FOCUS_DELAY);
        }
    }, [searchInput]);

    const onLeaveHandler = useCallback((): void => {
        if (showMenu) {
            setShowMenu(false);
            if (mxFilter.trim() !== "") {
                setMxFilter("");
            }
            if (focusedObjIndex !== -1) {
                setFocusedObjIndex(-1);
            }
            onLeave();
        }
    }, [showMenu, mxFilter, focusedObjIndex, onLeave, setMxFilter]);

    const onSelectHandler = useCallback(
        (selectedOption: IOption | undefined): void => {
            if (selectedOption) {
                if (Array.isArray(currentValue)) {
                    // reference set
                    if (hasCurrentValue) {
                        const selectedObjectItem = selectedOption.id as ObjectItem;
                        if (
                            currentValue.find(option => {
                                const iteratorObjectItem = option.id as ObjectItem;
                                return iteratorObjectItem.id === selectedObjectItem.id;
                            }) !== undefined
                        ) {
                            if (isClearable || currentValue.length > 1) {
                                // option already selected, deselect
                                onSelect(
                                    currentValue.filter(option => {
                                        const iteratorObjectItem = option.id as ObjectItem;
                                        return iteratorObjectItem.id !== selectedObjectItem.id;
                                    })
                                );
                            }
                        } else {
                            // list already exists, add to list
                            onSelect([...currentValue, selectedOption]);
                        }
                    } else {
                        // list is empty, start list
                        onSelect([selectedOption]);
                    }
                    // for reference sets, do not close the menu on select
                    if (clearSearchOnSelect) {
                        setMxFilter("");
                    }
                    return;
                } else {
                    // reference or enum
                    onSelect(selectedOption);
                }
            } else {
                // clear the selection
                onSelect(undefined);
            }
            if (selectionType !== "referenceSet") {
                setShowMenu(false);
            }
            onLeaveHandler();
        },
        [
            onSelect,
            currentValue,
            hasCurrentValue,
            clearSearchOnSelect,
            isClearable,
            onLeaveHandler,
            selectionType,
            setMxFilter
        ]
    );

    const handleClearAll = useCallback((): void => {
        if (focusedObjIndex !== -1) {
            setFocusedObjIndex(-1);
        }
        if (mxFilter.trim() !== "") {
            setMxFilter("");
        } else {
            onSelectHandler(undefined);
        }
        setTimeout(() => setShowMenu(true), FOCUS_DELAY);
        focusSearchInput();
    }, [focusedObjIndex, mxFilter, onSelectHandler, focusSearchInput, setMxFilter]);

    const handleKeyNavigation = useCallback(
        (event: KeyboardEvent<HTMLDivElement>): void => {
            const keyPressed = event.key;
            if (keyPressed === "ArrowUp" || keyPressed === "ArrowLeft") {
                if (focusedObjIndex === -1) {
                    setFocusedObjIndex(0);
                } else if (focusedObjIndex > 0) {
                    setFocusedObjIndex(focusedObjIndex - 1);
                } else if (hasMoreOptions) {
                    setFocusedObjIndex(options.length);
                } else {
                    setFocusedObjIndex(options.length - 1);
                }
                setShowMenu(true);
            } else if (keyPressed === "ArrowDown" || keyPressed === "ArrowRight") {
                if (focusedObjIndex === -1) {
                    setFocusedObjIndex(0);
                } else if (
                    focusedObjIndex < options.length - 1 ||
                    (focusedObjIndex === options.length - 1 && hasMoreOptions)
                ) {
                    setFocusedObjIndex(focusedObjIndex + 1);
                } else {
                    setFocusedObjIndex(0);
                }
                setShowMenu(true);
            } else if (keyPressed === "Enter") {
                if (focusedObjIndex > -1 && (allowLoadingSelect || !isLoading)) {
                    if (focusedObjIndex === options.length && onSelectMoreOptions) {
                        onSelectMoreOptions();
                    } else {
                        const currentFocusedOption = options[focusedObjIndex];
                        if (currentFocusedOption.isSelectable) {
                            onSelectHandler(currentFocusedOption);
                        }
                    }
                }
            } else if (keyPressed === "Escape" || keyPressed === "Tab") {
                onLeaveHandler();
            }
        },
        [
            focusedObjIndex,
            options,
            onSelectHandler,
            onSelectMoreOptions,
            onLeaveHandler,
            allowLoadingSelect,
            hasMoreOptions,
            isLoading
        ]
    );

    if (srsRef) {
        // eslint-disable-next-line react-hooks/rules-of-hooks
        useOnClickOutside(srsRef, onLeaveHandler);
    }

    const optionClickHandler = (selectedOption: IOption | undefined): void => {
        setFocusedObjIndex(-1);
        onSelectHandler(selectedOption);
        if (selectionType === "referenceSet") {
            focusSearchInput();
        }
    };

    const handleInputChange = (event: ChangeEvent<HTMLInputElement>): void => {
        const value = event.target.value;
        setMxFilter(value);
        setFocusedObjIndex(0);
        // make sure the dropdown is open if the user is typing
        if (value.trim() !== "" && !showMenu) {
            setShowMenu(true);
        }
    };

    return (
        <Fragment>
            {/* Aria Live Text */}
            <div className="srs-aria-live" aria-live="polite">
                {showMenu
                    ? isLoading
                        ? loadingText
                        : focusedObjIndex === options.length
                        ? moreResultsText
                        : focusedObjIndex > -1
                        ? options[focusedObjIndex].ariaLiveText
                        : currentValue
                        ? Array.isArray(currentValue)
                            ? currentValue.map((value, index) =>
                                  index < currentValue.length - 1 ? value.ariaLiveText + "&" : value.ariaLiveText
                              )
                            : currentValue.ariaLiveText
                        : ""
                    : ""}
            </div>
            <div
                className={classNames("form-control", { active: showMenu }, { "read-only": isReadOnly })}
                onClick={() => {
                    if (!isReadOnly) {
                        setShowMenu(!showMenu);
                        if (showMenu === false) {
                            focusSearchInput();
                        }
                    }
                }}
                onKeyDown={event => {
                    if (!isReadOnly) {
                        handleKeyNavigation(event);
                    }
                }}
                ref={srsRef}
            >
                <div className="srs-select">
                    <div
                        className={classNames(
                            "srs-value-container",
                            { "srs-multi": selectionType === "referenceSet" },
                            { "srs-compact": isCompact },
                            { "srs-badges": selectionType === "referenceSet" && referenceSetStyle === "badges" },
                            { "srs-commas": selectionType === "referenceSet" && referenceSetStyle === "commas" }
                        )}
                    >
                        {/* CurrentValueDisplay should be hidden if the user is typing and always be shown for reference sets */}
                        {(selectionType === "referenceSet" || mxFilter === "") && (
                            <CurrentValueDisplay
                                currentValue={currentValue}
                                isClearable={isClearable}
                                isReadOnly={isReadOnly}
                                maxReferenceDisplay={maxReferenceDisplay}
                                onRemove={(clickObj, byKeyboard) => {
                                    onSelectHandler(clickObj);
                                    if (byKeyboard && hasCurrentValue) {
                                        // focus the next remove icon for easier clear by keyboard navigation
                                        const nextIcon = srsRef?.current?.querySelector(
                                            ".srs-icon-focusable"
                                        ) as HTMLButtonElement;
                                        if (nextIcon) {
                                            nextIcon.focus();
                                        }
                                    } else {
                                        // re-focus the search input for easier muli-select
                                        focusSearchInput();
                                    }
                                }}
                                referenceSetStyle={referenceSetStyle}
                                clearIcon={clearIcon}
                                clearIconTitle={clearIconTitle}
                                onBadgeClick={onBadgeClick}
                                tabIndex={tabIndex}
                                badgeColor={badgeColor}
                            />
                        )}

                        {/* Hide Search Input if read only and there is already a value */}
                        {!(isReadOnly && hasCurrentValue) && (
                            <SearchInput
                                id={id}
                                name={name}
                                isReadOnly={isReadOnly}
                                isSearchable={isSearchable}
                                onChange={handleInputChange}
                                placeholder={placeholder}
                                setRef={newRef => setSearchInput(newRef)}
                                hasCurrentValue={hasCurrentValue}
                                searchFilter={mxFilter}
                                showMenu={showMenu}
                                setShowMenu={setShowMenu}
                                isReferenceSet={selectionType === "referenceSet"}
                                tabIndex={tabIndex}
                                isCompact={isCompact}
                            />
                        )}
                    </div>
                    {!isReadOnly && (
                        <div className="srs-icon-row" style={{ gridRow: selectionType === "referenceSet" ? 2 : 1 }}>
                            {selectionType === "referenceSet" && showSelectAll && (
                                <MxIcon
                                    tabIndex={tabIndex || 0}
                                    onClick={() => {
                                        setMxFilter("");
                                        setFocusedObjIndex(-1);
                                        onSelect(options.filter(option => option.isSelectable));
                                    }}
                                    title={selectAllIconTitle}
                                    mxIconOverride={selectAllIcon}
                                    defaultClassName="check"
                                />
                            )}

                            {isClearable && (
                                <MxIcon
                                    tabIndex={tabIndex || 0}
                                    onClick={handleClearAll}
                                    title={clearIconTitle}
                                    mxIconOverride={clearIcon}
                                    defaultClassName="remove"
                                />
                            )}
                            {selectStyle === "dropdown" && (
                                <MxIcon mxIconOverride={dropdownIcon} defaultClassName="menu-down" />
                            )}
                        </div>
                    )}
                </div>
            </div>
            {(showMenu || selectStyle === "list") && !isReadOnly && (
                <OptionsMenu
                    onSelect={optionClickHandler}
                    currentFocus={focusedObjIndex}
                    maxMenuHeight={maxMenuHeight}
                    noResultsText={noResultsText}
                    moreResultsText={moreResultsText}
                    optionsStyle={optionsStyle}
                    selectStyle={selectStyle}
                    position={position}
                    onSelectMoreOptions={() => {
                        if (onSelectMoreOptions) {
                            onSelectMoreOptions();
                            if (selectStyle === "dropdown") {
                                focusSearchInput();
                            }
                        }
                    }}
                    options={options}
                    hasMoreOptions={hasMoreOptions}
                    isLoading={isLoading}
                    loadingText={loadingText}
                    allowLoadingSelect={allowLoadingSelect}
                />
            )}
        </Fragment>
    );
};

export default Selector;
