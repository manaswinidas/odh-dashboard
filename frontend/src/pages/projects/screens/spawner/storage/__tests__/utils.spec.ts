import { renderHook, act } from '@testing-library/react';
import {
  useCreateStorageObject,
  useMountPathFormat,
  validateMountPath,
} from '~/pages/projects/screens/spawner/storage/utils';
import { MountPathFormat } from '~/pages/projects/screens/spawner/storage/types';
import { MOUNT_PATH_PREFIX } from '~/pages/projects/screens/spawner/storage/const';
import { PersistentVolumeClaimKind } from '~/k8sTypes';

jest.mock('~/pages/projects/screens/spawner/storage/useDefaultPvcSize.ts', () => ({
  __esModule: true,
  default: jest.fn().mockReturnValue('1Gi'), // Set the default PVC size to 1Gi
}));

jest.mock('~/concepts/k8s/utils', () => ({
  getDisplayNameFromK8sResource: jest.fn(
    (data) => data?.metadata.annotations?.['openshift.io/display-name'] || '',
  ),
  getDescriptionFromK8sResource: jest.fn(
    (data) => data?.metadata.annotations?.['openshift.io/description'] || '',
  ),
}));

describe('useCreateStorageObject', () => {
  const existingData: PersistentVolumeClaimKind = {
    apiVersion: 'v1',
    kind: 'PersistentVolumeClaim',
    metadata: {
      annotations: {
        'openshift.io/description': 'Test PVC Description',
        'openshift.io/display-name': 'test-pvc',
      },
      labels: { 'opendatahub.io/dashboard': 'true' },
      name: 'test-pvc',
      namespace: 'namespace',
    },
    spec: {
      accessModes: ['ReadWriteOnce'],
      resources: { requests: { storage: '2Gi' } },
      volumeMode: 'Filesystem',
      storageClassName: 'test-storage-class',
    },
    status: { phase: 'Pending' },
  };
  it('should initialize with default values when no existingData is provided', () => {
    const { result } = renderHook(() => useCreateStorageObject());

    const [data] = result.current;
    expect(data).toEqual({
      nameDesc: { name: '', k8sName: undefined, description: '' },
      size: '1Gi',
    });
  });

  it('should initialize with existingData when provided', () => {
    const { result } = renderHook(() => useCreateStorageObject(existingData));

    const [data] = result.current;
    expect(data.nameDesc.name).toBe('test-pvc');
    expect(data.nameDesc.description).toBe('Test PVC Description');
    expect(data.size).toBe('2Gi');
    expect(data.storageClassName).toBe('test-storage-class');
  });

  it('should reset to default values when resetDefaults is called', () => {
    const { result } = renderHook(() => useCreateStorageObject(existingData));
    const [, , resetDefaults] = result.current;

    act(() => {
      resetDefaults();
    });

    const [data] = result.current;
    expect(data.nameDesc.name).toBe('');
    expect(data.nameDesc.description).toBe('');
    expect(data.size).toBe('1Gi'); // Default size from mock
    expect(data.storageClassName).toBeUndefined();
  });
});

describe('validateMountPath', () => {
  const inUseMountPaths = ['/existing-folder', '/another-folder'];

  it('should return error message for empty value in CUSTOM format', () => {
    const result = validateMountPath('', inUseMountPaths, MountPathFormat.CUSTOM);
    expect(result).toBe(
      'Enter a path to a model or folder. This path cannot point to a root folder.',
    );
  });

  it('should not return an error for empty value in STANDARD format', () => {
    const result = validateMountPath('', inUseMountPaths, MountPathFormat.STANDARD);
    expect(result).toBe('');
  });

  it('should return error message for invalid characters in the path', () => {
    const result = validateMountPath('Invalid/Path', inUseMountPaths, MountPathFormat.STANDARD);
    expect(result).toBe('Must only consist of lowercase letters, dashes, and slashes.');
  });

  it('should return error message for already in-use mount path', () => {
    const result = validateMountPath('existing-folder', inUseMountPaths, MountPathFormat.STANDARD);
    expect(result).toBe('Mount folder is already in use for this workbench.');
  });

  it('should return an empty string for valid and unused mount path', () => {
    const result = validateMountPath('new-folder', inUseMountPaths, MountPathFormat.STANDARD);
    expect(result).toBe('');
  });

  it('should allow valid folder name with a trailing slash', () => {
    const result = validateMountPath('valid-folder/', inUseMountPaths, MountPathFormat.STANDARD);
    expect(result).toBe('');
  });

  it('should return error for an invalid folder name with numbers or uppercase letters', () => {
    const result = validateMountPath('Invalid123', inUseMountPaths, MountPathFormat.STANDARD);
    expect(result).toBe('Must only consist of lowercase letters, dashes, and slashes.');
  });

  it('should return an empty string for valid mount path in CUSTOM format', () => {
    const result = validateMountPath('custom-folder', inUseMountPaths, MountPathFormat.CUSTOM);
    expect(result).toBe('');
  });

  it('should return error for an invalid folder name with uppercase letters in CUSTOM format', () => {
    const result = validateMountPath('InvalidFolder', inUseMountPaths, MountPathFormat.CUSTOM);
    expect(result).toBe('Must only consist of lowercase letters, dashes, and slashes.');
  });
});

describe('useMountPathFormat', () => {
  it('return MountPathFormat.STANDARD if isCreate is true', () => {
    const { result } = renderHook(() => useMountPathFormat(true, 'some-path'));

    const [format] = result.current;
    expect(format).toBe(MountPathFormat.STANDARD);
  });

  it('return MountPathFormat.STANDARD if mountPath starts with /opt/app-root/src/', () => {
    const { result } = renderHook(() =>
      useMountPathFormat(false, `${MOUNT_PATH_PREFIX}/some-path`),
    );

    const [format] = result.current;
    expect(format).toBe(MountPathFormat.STANDARD);
  });

  it('return MountPathFormat.CUSTOM if mountPath does not start with /opt/app-root/src/', () => {
    const { result } = renderHook(() => useMountPathFormat(false, '/custom-path'));

    const [format] = result.current;
    expect(format).toBe(MountPathFormat.CUSTOM);
  });

  it('should update format based on the mountPath change', () => {
    const { result, rerender } = renderHook(
      ({ isCreate, mountPath }) => useMountPathFormat(isCreate, mountPath),
      {
        initialProps: { isCreate: false, mountPath: '/custom-path' },
      },
    );

    // Initial format
    expect(result.current[0]).toBe(MountPathFormat.CUSTOM);

    // Change the mountPath to a path with MOUNT_PATH_PREFIX
    rerender({ isCreate: false, mountPath: `${MOUNT_PATH_PREFIX}/new-path` });

    // Format should update to STANDARD
    expect(result.current[0]).toBe(MountPathFormat.STANDARD);
  });

  it('should not update format if isCreate is true, regardless of mountPath', () => {
    const { result, rerender } = renderHook(
      ({ isCreate, mountPath }) => useMountPathFormat(isCreate, mountPath),
      {
        initialProps: { isCreate: true, mountPath: '/custom-path' },
      },
    );

    // Initial format
    expect(result.current[0]).toBe(MountPathFormat.STANDARD);

    // Change the mountPath but keep isCreate true
    rerender({ isCreate: true, mountPath: `${MOUNT_PATH_PREFIX}/new-path` });

    // Format should remain STANDARD
    expect(result.current[0]).toBe(MountPathFormat.STANDARD);
  });
});