import React from 'react';
import PropTypes from 'prop-types';
import { Modal, ModalHeader, ModalBody, ModalFooter } from 'reactstrap';
import { Icon } from 'antd';

export default class CustomModal extends React.Component{
    render() {
    const {
        textDirection,
        btnMargin,
        footerCancel,
        footerOkLoading,
        footerOk,
        footerOkClick,
        modalBody,
        isOpen,
        heading,
        close
    } = this.props;
    return(
        <Modal
            isOpen={isOpen}
            toggle={close}
            backdrop={'static'}
            className="dr-modal"
        >
            <ModalHeader>
                <Icon type="check-circle" />
                <h5>{heading}</h5>
            </ModalHeader>
            <ModalBody>
                <div className="row">
                    <div className={`col ml-auto ${textDirection}`}>
                    {modalBody}
                    </div>
                </div>
            </ModalBody>
            <ModalFooter>
            <button
                className={`btn btn-white border px-3 ${btnMargin}`}
                onClick={close}
            >
                {footerCancel}
            </button>
            <button
                disabled={footerOkLoading}
                className="btn btn-primary px-3"
                onClick={footerOkClick}
                style={{ width: '25%' }}
            >
                {footerOkLoading && (
                <span>
                    <i
                    className="fa fa-circle-o-notch fa-spin"
                    style={{ marginRight: '10px' }}
                    />{' '}
                </span>
                )}
                {footerOk}
            </button>{' '}
            </ModalFooter>
        </Modal>
    )
    }
}
CustomModal.propTypes = {
    textDirection: PropTypes.string,
    btnMargin: PropTypes.string,
    footerCancel: PropTypes.string,
    footerOkLoading: PropTypes.bool,
    footerOk: PropTypes.string,
    footerOkClick: PropTypes.func,
    modalBody: PropTypes.element,
    isOpen: PropTypes.bool,
    close: PropTypes.func,
    heading: PropTypes.string
};
CustomModal.defaultProps = {
    isOpen: false,
    footerOkLoading: false,
    heading: 'Are you sure?'
}