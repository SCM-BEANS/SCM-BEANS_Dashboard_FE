import { useRouter } from "next/router";
import { BackButtonHeading } from "@/components/navigation/back-button-heading";
import { MachineRegistrationForm } from "@/components/features/asset-management/machine-registration-form";
import { PATH_CUSTOMER } from "@/routes/path";
import { CUSTOMER_MESSAGES } from "@/text/customer/customer-messages";
import { useOwnerSubject } from "../shared/customer-screen-common";
import styles from "../customer-shell.module.css";

export function MachineRegistrationScreen() {
  const router = useRouter();
  const { ownerId, checked } = useOwnerSubject();
  const messages = CUSTOMER_MESSAGES.READ_SCREENS;

  return (
    <section className={styles.pageContent} aria-labelledby="customer-machine-registration-title">
      <BackButtonHeading
        back={{ label: "Danh sách máy của tôi", fallbackHref: PATH_CUSTOMER.MACHINES }}
        title="Đăng ký máy"
        titleId="customer-machine-registration-title"
        description="Nhập thông tin máy cần đăng ký vào tài khoản."
        className={styles.pageHeading}
      />
      {!checked ? <p className={styles.loadingNotice} role="status">{messages.LOADING}</p> : ownerId ? (
        <MachineRegistrationForm
          mode="owner"
          ownerId={ownerId}
          onCancel={() => void router.push(PATH_CUSTOMER.MACHINES)}
          onCreated={(machineId) => void router.replace(PATH_CUSTOMER.MACHINE_DETAIL(machineId))}
        />
      ) : <div className={styles.errorNotice} role="alert">{messages.IDENTITY_UNAVAILABLE}</div>}
    </section>
  );
}
