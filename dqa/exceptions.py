"""
DQA Domain Exceptions
======================
Typed exceptions raised by the DQA engine. Backend teams should map each
exception type to the appropriate HTTP status code (see docstrings).
"""


class DQAError(Exception):
    """Base class for all DQA engine exceptions."""


class CapacityExceededError(DQAError):
    """
    Raised when a FarmerRequest exceeds available procurement capacity for its crop.

    Attributes:
        crop: The crop name that was over-requested.
        requested_qtl: Quantity the farmer requested.
        available_qtl: Quantity actually available at time of request.

    HTTP mapping: 422 Unprocessable Entity
    """

    def __init__(self, crop: str, requested_qtl: float, available_qtl: float) -> None:
        self.crop = crop
        self.requested_qtl = requested_qtl
        self.available_qtl = available_qtl
        super().__init__(
            f"Procurement capacity exceeded for crop '{crop}': "
            f"requested {requested_qtl} qtl, only {available_qtl:.2f} qtl available."
        )


class UnknownBookingError(DQAError):
    """
    Raised when an operation references a booking_id that does not exist in QueueState.

    HTTP mapping: 404 Not Found
    """

    def __init__(self, booking_id: str) -> None:
        self.booking_id = booking_id
        super().__init__(f"No booking found with id '{booking_id}'.")


class UnknownCounterError(DQAError):
    """
    Raised when an operation references a counter_id that does not exist.

    HTTP mapping: 404 Not Found
    """

    def __init__(self, counter_id: str) -> None:
        self.counter_id = counter_id
        super().__init__(f"No counter found with id '{counter_id}'.")


class InvalidStateTransitionError(DQAError):
    """
    Raised when an operation attempts an illegal booking status transition.
    For example: completing an already-completed booking, or processing a cancelled entry.

    Attributes:
        booking_id: The affected booking.
        current_status: The booking's current status string.
        attempted_status: The status transition that was attempted.

    HTTP mapping: 409 Conflict
    """

    def __init__(self, booking_id: str, current_status: str, attempted_status: str) -> None:
        self.booking_id = booking_id
        self.current_status = current_status
        self.attempted_status = attempted_status
        super().__init__(
            f"Invalid state transition for booking '{booking_id}': "
            f"cannot move from '{current_status}' to '{attempted_status}'."
        )


class UnknownCropError(DQAError):
    """
    Raised when a FarmerRequest references a crop not present in the engine's crop table.

    HTTP mapping: 422 Unprocessable Entity
    """

    def __init__(self, crop: str) -> None:
        self.crop = crop
        super().__init__(
            f"Crop '{crop}' is not registered in this centre's crop table."
        )


class InvalidTransferRequestError(DQAError):
    """
    Raised when accept_centre_transfer or decline_centre_transfer is called on a booking
    that is not in CONGESTION_ALTERNATE_SUGGESTED state.

    HTTP mapping: 409 Conflict
    """

    def __init__(self, booking_id: str, current_status: str) -> None:
        self.booking_id = booking_id
        self.current_status = current_status
        super().__init__(
            f"Cannot respond to transfer offer for booking '{booking_id}': "
            f"current status is '{current_status}', expected 'CONGESTION_ALTERNATE_SUGGESTED'."
        )


class TransferTargetRejectedError(DQAError):
    """
    Raised when the target centre rejects an accepted transfer request during atomic transfer.

    HTTP mapping: 422 Unprocessable Entity
    """

    def __init__(self, booking_id: str, target_centre_id: str, reason: str) -> None:
        self.booking_id = booking_id
        self.target_centre_id = target_centre_id
        self.reason = reason
        super().__init__(
            f"Transfer failed for booking '{booking_id}' at target centre '{target_centre_id}': {reason}"
        )

